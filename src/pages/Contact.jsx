import {
  Alert,
  Avatar,
  Box,
  Button,
  CardActions,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  Add as AddIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material'
import { useEffect, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import { useAppRuntime } from '../hooks/useAppRuntime.js'
import { fetchJson } from '../utils/api.js'

const emptyContact = {
  name: '',
  role: '',
  email: '',
  office_hours: '',
  office_location: '',
}

const toContactForm = (contact) => ({
  name: contact?.name || '',
  role: contact?.role || '',
  email: contact?.email || '',
  office_hours: contact?.office_hours || '',
  office_location: contact?.office_location || '',
})

const initials = (name) => name
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .map((part) => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase()

function ContactFormDialog({ contact, error, open, onClose, onSave, saving }) {
  const [form, setForm] = useState(emptyContact)

  useEffect(() => {
    setForm(toContactForm(contact))
  }, [contact, open])

  const change = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const submit = (event) => {
    event.preventDefault()
    onSave({
      ...form,
      office_hours: form.office_hours.trim() || null,
      office_location: form.office_location.trim() || null,
    })
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={submit}>
        <DialogTitle>{contact?.id ? 'Edit contact' : 'Add contact'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Name" value={form.name} onChange={change('name')} required autoFocus />
            <TextField label="Role" value={form.role} onChange={change('role')} required />
            <TextField label="Email" type="email" value={form.email} onChange={change('email')} required />
            <TextField label="Office hours" value={form.office_hours} onChange={change('office_hours')} multiline minRows={2} />
            <TextField label="Office location" value={form.office_location} onChange={change('office_location')} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving' : 'Save'}</Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

export default function Contact({ isInstructorView = false }) {
  const { activeCourseId, isSandbox } = useAppRuntime()
  const theme = useTheme()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [editingContact, setEditingContact] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  const loadContacts = async () => {
    if (isSandbox || !activeCourseId) {
      setContacts([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      setContacts(await fetchJson(`/api/courses/${activeCourseId}/contacts`))
    } catch (requestError) {
      setError(requestError.message || 'Unable to load contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContacts()
  }, [activeCourseId, isSandbox])

  const saveContact = async (form) => {
    setSaving(true)
    setFormError('')
    try {
      const path = editingContact?.id
        ? `/api/courses/${activeCourseId}/contacts/${editingContact.id}`
        : `/api/courses/${activeCourseId}/contacts`
      await fetchJson(path, {
        method: editingContact?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setEditingContact(null)
      await loadContacts()
    } catch (requestError) {
      setFormError(requestError.message || 'Unable to save contact')
    } finally {
      setSaving(false)
    }
  }

  const deleteContact = async () => {
    if (!deleteTarget) return
    setSaving(true)
    setError('')
    try {
      await fetchJson(`/api/courses/${activeCourseId}/contacts/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      await loadContacts()
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete contact')
    } finally {
      setSaving(false)
    }
  }

  const canManage = isInstructorView && !isSandbox && Boolean(activeCourseId)

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>Contact staff</Typography>
        {canManage && <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormError(''); setEditingContact(emptyContact) }}>Add contact</Button>}
      </Stack>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        Find contact information for professors, teaching assistants, and support staff. Click on email addresses to send messages.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
        <strong>Note:</strong> Please allow 1 business day for response
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : contacts.length === 0 ? (
        <ThemedCard><CardContent><Typography color="text.secondary">No contacts have been added for this course</Typography></CardContent></ThemedCard>
      ) : (
        <Stack spacing={2}>
          {contacts.map((contact) => (
            <ThemedCard key={contact.id}>
              {canManage && (
                <CardActions sx={{ justifyContent: 'flex-end', gap: 0.5, p: 1, pb: 0 }}>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => { setFormError(''); setEditingContact(contact) }}>Edit</Button>
                  <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteTarget(contact)}>Delete</Button>
                </CardActions>
              )}
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }}>
                  <Avatar
                    sx={{
                      width: 90,
                      height: 90,
                      bgcolor: theme.palette.primary.main,
                      fontSize: '2rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {initials(contact.name)}
                  </Avatar>
                  <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>{contact.name}</Typography>
                      <Typography variant="h6" component="p" color="text.secondary">{contact.role}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Button
                        href={`mailto:${contact.email}`}
                        size="medium"
                        startIcon={<EmailIcon sx={{ color: 'primary.main' }} />}
                        sx={{ textTransform: 'none', fontSize: '1rem', fontWeight: 500 }}
                      >
                        {contact.email}
                      </Button>
                    </Box>
                    {(contact.office_hours || contact.office_location) && (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 3 }} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                        {contact.office_hours && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ScheduleIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>Office hours</Typography>
                              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.2 }}>{contact.office_hours}</Typography>
                            </Box>
                          </Box>
                        )}
                        {contact.office_location && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>Office location</Typography>
                              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.2 }}>{contact.office_location}</Typography>
                            </Box>
                          </Box>
                        )}
                      </Stack>
                    )}
                  </Box>
                  <Button
                    variant="contained"
                    color="primary"
                    href={`mailto:${contact.email}`}
                    startIcon={<EmailIcon sx={{ color: 'inherit' }} />}
                    size="large"
                    sx={{ minWidth: 180, height: 48, fontSize: '1rem' }}
                  >
                    Contact
                  </Button>
                </Stack>
              </CardContent>
            </ThemedCard>
          ))}
        </Stack>
      )}

      {canManage && (
        <>
          <ContactFormDialog contact={editingContact} error={formError} open={Boolean(editingContact)} onClose={() => setEditingContact(null)} onSave={saveContact} saving={saving} />
          <Dialog open={Boolean(deleteTarget)} onClose={saving ? undefined : () => setDeleteTarget(null)}>
            <DialogTitle>Delete contact</DialogTitle>
            <DialogContent><Typography>Delete {deleteTarget?.name} from this course</Typography></DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button>
              <Button color="error" variant="contained" onClick={deleteContact} disabled={saving}>Delete</Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  )
}
