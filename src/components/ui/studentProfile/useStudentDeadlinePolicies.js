import { useEffect, useMemo, useState } from "react";
import { useAppRuntime } from "../../../hooks/useAppRuntime.js";
import { toEasternIso } from "../../../utils/easternTime.js";

const makeDeadlineMap = (rows = []) =>
  rows.reduce((map, row) => {
    if (row?.assignment_id) map[row.assignment_id] = row;
    return map;
  }, {});

const fetchDeadlineMap = async (courseActions, activeCourseId, studentId) =>
  makeDeadlineMap(
    await courseActions.getDeadlines?.(activeCourseId, studentId)
  );

/*
loads and saves one student's course accommodations and per assignment extensions
the deadline map feeds assignment statuses so it refreshes after every save
*/
export default function useStudentDeadlinePolicies({
  open,
  student,
  assignments,
  canEditAccommodations,
}) {
  const { courseState, courseActions } = useAppRuntime();
  const { activeCourseId } = courseState;

  const [accommodationLoading, setAccommodationLoading] = useState(false);
  const [accommodationError, setAccommodationError] = useState("");
  const [accommodationSaved, setAccommodationSaved] = useState(false);
  const [extraLateDays, setExtraLateDays] = useState("0");
  const [latePenaltyWaived, setLatePenaltyWaived] = useState(false);
  const [accommodationAnchorEl, setAccommodationAnchorEl] = useState(null);

  const [extensionAssignmentId, setExtensionAssignmentId] = useState("");
  const [extensionDate, setExtensionDate] = useState("");
  const [extensionTime, setExtensionTime] = useState("23:59");
  const [extensionSaving, setExtensionSaving] = useState(false);
  const [extensionError, setExtensionError] = useState("");
  const [deadlineMap, setDeadlineMap] = useState({});
  const [extensionAnchorEl, setExtensionAnchorEl] = useState(null);
  const [extensionPopoverAssignmentId, setExtensionPopoverAssignmentId] =
    useState(null);

  const extensionPopoverAssignment = useMemo(() => {
    if (!extensionPopoverAssignmentId) return null;
    return assignments.find(
      (a) => String(a.id) === String(extensionPopoverAssignmentId)
    );
  }, [assignments, extensionPopoverAssignmentId]);

  useEffect(() => {
    if (!open || !student || !canEditAccommodations) return;
    let isMounted = true;
    const load = async () => {
      setAccommodationLoading(true);
      setAccommodationError("");
      try {
        const rows = await courseActions.getAccommodations?.(activeCourseId, student.id);
        if (!isMounted) return;
        const record = (rows || []).find((r) => r.user_id === student.id);
        const lateDaysValue = Number.isFinite(Number(record?.extra_late_days))
          ? String(record.extra_late_days)
          : "0";
        setExtraLateDays(lateDaysValue);
        setLatePenaltyWaived(Boolean(record?.late_penalty_waived));
      } catch (err) {
        if (!isMounted) return;
        setAccommodationError("Failed to load accommodations.");
      } finally {
        if (isMounted) setAccommodationLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [open, student, activeCourseId, canEditAccommodations, courseActions]);

  useEffect(() => {
    if (!open || !student || !canEditAccommodations) return;
    let isMounted = true;
    const load = async () => {
      try {
        const map = await fetchDeadlineMap(courseActions, activeCourseId, student.id);
        if (!isMounted) return;
        setDeadlineMap(map);
      } catch (err) {
        if (!isMounted) return;
        setDeadlineMap({});
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [open, student, activeCourseId, canEditAccommodations, courseActions]);

  const saveAccommodation = async () => {
    if (!student) return;
    setAccommodationSaved(false);
    setAccommodationError("");
    setAccommodationLoading(true);
    try {
      const payload = {
        user_id: student.id,
        extra_late_days: Math.max(0, parseInt(extraLateDays || "0", 10) || 0),
        late_penalty_waived: Boolean(latePenaltyWaived),
      };
      await courseActions.saveAccommodations?.(activeCourseId, student.id, payload);
      try {
        setDeadlineMap(await fetchDeadlineMap(courseActions, activeCourseId, student.id));
      } catch (err) {
        // keep existing deadlines
      }
      setAccommodationSaved(true);
      setAccommodationAnchorEl(null);
      setTimeout(() => setAccommodationSaved(false), 1500);
    } catch (err) {
      setAccommodationError("Failed to save accommodations.");
    } finally {
      setAccommodationLoading(false);
    }
  };

  const openAccommodation = (event) => {
    if (!canEditAccommodations) return;
    setAccommodationAnchorEl(event.currentTarget);
  };

  const saveExtension = async () => {
    setExtensionError("");
    const assignmentId = Number(extensionAssignmentId);
    if (!Number.isFinite(assignmentId)) {
      setExtensionError("Choose an assignment.");
      return;
    }
    const iso = toEasternIso(extensionDate, extensionTime);
    if (!iso) {
      setExtensionError("Choose an unambiguous New York date and time.");
      return;
    }
    setExtensionSaving(true);
    try {
      await courseActions.saveDeadline?.(activeCourseId, assignmentId, student.id, iso);
      try {
        setDeadlineMap(await fetchDeadlineMap(courseActions, activeCourseId, student.id));
      } catch (err) {
        setDeadlineMap((prev) => ({
          ...prev,
          [assignmentId]: {
            ...(prev?.[assignmentId] ?? {}),
            due_at: iso,
          },
        }));
      }
      setExtensionAnchorEl(null);
      setExtensionPopoverAssignmentId(null);
    } catch (err) {
      setExtensionError("Failed to save extension.");
    } finally {
      setExtensionSaving(false);
    }
  };

  const selectExtensionAssignment = (event, assignment) => {
    if (!canEditAccommodations) return;
    setExtensionError("");
    setExtensionAssignmentId(String(assignment.id));
    setExtensionDate(assignment.dueDate || "");
    setExtensionTime(assignment.dueTime || "23:59");
    setExtensionPopoverAssignmentId(assignment.id);
    setExtensionAnchorEl(event.currentTarget);
  };

  const closeExtension = () => {
    setExtensionAnchorEl(null);
    setExtensionPopoverAssignmentId(null);
  };

  return {
    deadlineMap,
    accommodation: {
      anchorEl: accommodationAnchorEl,
      error: accommodationError,
      extraLateDays,
      latePenaltyWaived,
      loading: accommodationLoading,
      saved: accommodationSaved,
      close: () => setAccommodationAnchorEl(null),
      open: openAccommodation,
      save: saveAccommodation,
      setExtraLateDays,
      setLatePenaltyWaived,
    },
    // named after the extension popover's props so the modal can spread them
    extension: {
      anchorEl: extensionAnchorEl,
      assignmentName: extensionPopoverAssignment?.name,
      date: extensionDate,
      error: extensionError,
      saving: extensionSaving,
      time: extensionTime,
      onClose: closeExtension,
      onDateChange: setExtensionDate,
      onSave: saveExtension,
      onTimeChange: setExtensionTime,
    },
    selectExtensionAssignment,
  };
}
