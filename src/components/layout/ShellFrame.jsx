import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useEffect, useRef } from "react";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import RulesReference from "../ui/RulesReference.jsx";
import AccountSettingsDialog from "../ui/AccountSettingsDialog.jsx";
import { useLayoutState } from "../../context/LayoutContext.jsx";

export default function ShellFrame({
  children,
  location,
  sidebarStructure,
  onSignOut,
  onOpenSettings,
  showAccountSettings = false,
  isAccountSettingsOpen = false,
  onCloseAccountSettings,
}) {
  const { isRulesReferenceOpen } = useLayoutState();
  const mainContentRef = useRef(null);
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up("lg"));
  const hasDesktopPointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  const isDesktopRulebookLayout = isLargeScreen && hasDesktopPointer;
  const shouldShiftShellForRulebook = isDesktopRulebookLayout && isRulesReferenceOpen;

  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });

      if (mainContentRef.current) {
        mainContentRef.current.scrollTo({
          top: 0,
          left: 0,
          behavior: "smooth",
        });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        minWidth: 0,
        height: { xs: "auto", md: "100dvh" },
        overflow: { xs: "visible", md: "hidden" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
          minWidth: 0,
          minHeight: { xs: "auto", md: 0 },
          overflow: { xs: "visible", md: "hidden" },
          transform: shouldShiftShellForRulebook ? "translateX(16px)" : "translateX(0)",
          transition: (t) =>
            t.transitions.create("transform", {
              duration: t.transitions.duration.shorter,
            }),
        }}
      >
        <Sidebar
          structure={sidebarStructure}
          location={location}
          onSignOut={onSignOut}
          onOpenSettings={onOpenSettings}
        />
        <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0 }}>
          <Header onSignOut={onSignOut} onOpenSettings={onOpenSettings} />
          <Box
            component="main"
            ref={mainContentRef}
            sx={{
              flexGrow: 1,
              p: 3,
              pt: /\/assignment\/[^/]+$/.test(location.pathname) ? 2 : 3,
              backgroundColor: "background.default",
              minHeight: { xs: "100vh", md: 0 },
              overflow: "auto",
              overflowX: "hidden",
              minWidth: 0,
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
      {showAccountSettings && (
        <AccountSettingsDialog
          open={isAccountSettingsOpen}
          onClose={onCloseAccountSettings}
        />
      )}
      <RulesReference />
    </Box>
  );
}
