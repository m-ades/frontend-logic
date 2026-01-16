import {
  Box,
  Typography,
  CardContent,
  Stack,
  Avatar,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  CardActions,
  Switch,
  FormControlLabel
} from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import {
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  LocationOn as LocationIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import { useState } from 'react'

export default function Contact() {
  // View mode state
  const [isInstructorView, setIsInstructorView] = useState(true)

  // Mock contact data
  const [contacts, setContacts] = useState([
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      role: "Professor",
      email: "sarah.johnson@myhunter.cuny.edu",
      officeHours: "Mon/Wed 2:00-4:00 PM",
      officeLocation: "West Building, Room 305",
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "Course Tutor",
      email: "michael.chen@myhunter.cuny.edu",
      officeHours: "Tue/Thu 1:00-3:00 PM",
      officeLocation: "Library 5th Floor",
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      role: "Teaching Assistant",
      email: "emily.rodriguez@myhunter.cuny.edu",
      officeHours: "Wednesday 2:00-5:00 PM",
    },
    {
      id: 4,
      name: "IT Support",
      role: "Technical Support",
      email: "support@myhunter.cuny.edu",
      officeHours: "Mon-Fri 9:00 AM-5:00 PM",
      forBugReports: true
    },
    {
      id: 5,
      name: "Dr. Robert Wilson",
      role: "Professor",
      email: "robert.wilson@myhunter.cuny.edu",
    }
  ])

  const [openDialog, setOpenDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState('add') 
  const [editingContactId, setEditingContactId] = useState(null)
  const [newContact, setNewContact] = useState({
    name: "",
    role: "Teaching Assistant",
    email: "",
    officeHours: "",
    officeLocation: "",
    forBugReports: false
  })

  const roleOptions = [
    "Professor",
    "Associate Professor",
    "Assistant Professor",
    "Teaching Assistant",
    "Course Tutor",
    "Technical Support",
    "Administrative Staff"
  ]

  const handleOpenAddDialog = () => {
    setDialogMode('add')
    setEditingContactId(null)
    setNewContact({
      name: "",
      role: "Teaching Assistant",
      email: "",
      officeHours: "",
      officeLocation: "",
      forBugReports: false
    })
    setOpenDialog(true)
  }

  const handleOpenEditDialog = (contact) => {
    setDialogMode('edit')
    setEditingContactId(contact.id)
    setNewContact({
      name: contact.name,
      role: contact.role,
      email: contact.email,
      officeHours: contact.officeHours || "",
      officeLocation: contact.officeLocation || "",
      forBugReports: contact.forBugReports || false
    })
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingContactId(null)
  }

  const handleSaveContact = () => {
    if (!newContact.name.trim() || !newContact.email.trim()) {
      alert("Please fill in at least name and email")
      return
    }

    const contactData = {
      name: newContact.name.trim(),
      role: newContact.role,
      email: newContact.email.trim(),
      officeHours: newContact.officeHours.trim(),
      officeLocation: newContact.officeLocation.trim(),
      forBugReports: newContact.forBugReports
    }

    if (dialogMode === 'add') {
      const contactToAdd = {
        id: contacts.length + 1,
        ...contactData
      }
      setContacts([...contacts, contactToAdd])
    } else {
      setContacts(contacts.map(contact => 
        contact.id === editingContactId 
          ? { ...contact, ...contactData }
          : contact
      ))
    }

    handleCloseDialog()
  }

  const handleDeleteContact = (id) => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      setContacts(contacts.filter(contact => contact.id !== id))
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setNewContact(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleViewToggle = () => {
    setIsInstructorView(!isInstructorView)
  }

  // Separate regular contacts and bug report contacts
  const regularContacts = contacts.filter(contact => !contact.forBugReports)
  const bugReportContacts = contacts.filter(contact => contact.forBugReports)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Contact Staff
        </Typography>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isInstructorView}
                  onChange={handleViewToggle}
                  color="primary"
                  size="small"
                />
              }
              label={
                <Typography variant="body2">
                  {isInstructorView ? 'Instructor View' : 'Student View'}
                </Typography>
              }
              labelPlacement="start"
            />
          </Box>
          
          {/* Add button - only show in instructor view */}
          {isInstructorView && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
              sx={{ borderRadius: 2 }}
            >
              Add
            </Button>
          )}
        </Stack>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        Find contact information for professors, teaching assistants, and support staff.
        Click on email addresses to send messages.
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
        <strong>Note:</strong> Please allow 1 business day for response
      </Typography>

      <Box sx={{ 
        mb: 3, 
        p: 1.5, 
        bgcolor: isInstructorView ? 'primary.light' : 'info.light', 
        borderRadius: 1,
        border: '1px solid',
        borderColor: isInstructorView ? 'primary.main' : 'info.main'
      }}>
        <Typography variant="body2" align="center" fontWeight="medium" sx={{ color: 'white' }}>
          <strong>{isInstructorView ? 'Instructor View' : 'Student View'}</strong>
          {isInstructorView ? ' - You can add, edit, and delete contacts' : ' - Read-only mode'}
        </Typography>
      </Box>

      {/* Part 1: Regular contacts */}
      {regularContacts.length > 0 && (
        <Stack spacing={3} sx={{ mb: 4 }}>
          {regularContacts.map((contact) => (
            <ThemedCard key={contact.id}>
              {/* Edit and Delete buttons - only show in instructor view */}
              {isInstructorView && (
                <CardActions sx={{ justifyContent: 'flex-end', p: 1, pb: 0 }}>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEditDialog(contact)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteContact(contact.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </CardActions>
              )}
              
              <CardContent>
                <Stack direction="row" spacing={3} alignItems="center">
                  <Avatar
                    sx={{
                      width: 90,
                      height: 90,
                      bgcolor: '#1976d2',
                      fontSize: '2rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {contact.name.split(' ').map(n => n[0]).join('')}
                  </Avatar>

                  <Divider orientation="vertical" flexItem />

                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {contact.name}
                      </Typography>
                      <Typography variant="h6" color="text.secondary">
                        {contact.role}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Button
                        href={`mailto:${contact.email}`}
                        size="medium"
                        startIcon={<EmailIcon />}
                        sx={{ 
                          textTransform: 'none', 
                          fontSize: '1rem',
                          fontWeight: 500 
                        }}
                      >
                        {contact.email}
                      </Button>
                    </Box>

                    {(contact.officeHours || contact.officeLocation) && (
                      <Stack 
                        direction={{ xs: 'column', sm: 'row' }} 
                        spacing={{ xs: 1, sm: 3 }}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                      >
                        {contact.officeHours && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ScheduleIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                Office Hours
                              </Typography>
                              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                                {contact.officeHours}
                              </Typography>
                            </Box>
                          </Box>
                        )}

                        {contact.officeLocation && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                Office Location
                              </Typography>
                              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                                {contact.officeLocation}
                              </Typography>
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
                    startIcon={<EmailIcon />}
                    size="large"
                    sx={{ 
                      minWidth: 180,
                      height: 48,
                      fontSize: '1rem'
                    }}
                  >
                    Contact
                  </Button>
                </Stack>
              </CardContent>
            </ThemedCard>
          ))}
        </Stack>
      )}

      {/* Part 2: Bug report contacts - Always at the bottom */}
      {bugReportContacts.length > 0 && (
        <>
          {regularContacts.length > 0 && (
            <Divider sx={{ my: 4 }}>
              <Chip label="Technical Support" color="error" />
            </Divider>
          )}
          
          <Stack spacing={3}>
            {bugReportContacts.map((contact) => (
              <ThemedCard key={contact.id}>
                {/* Edit and Delete buttons - only show in instructor view */}
                {isInstructorView && (
                  <CardActions sx={{ justifyContent: 'flex-end', p: 1, pb: 0 }}>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEditDialog(contact)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </CardActions>
                )}
                
                <CardContent>
                  <Stack direction="row" spacing={3} alignItems="center">
                    <Avatar
                      sx={{
                        width: 90,
                        height: 90,
                        bgcolor: '#d32f2f',
                        fontSize: '2rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {contact.name.split(' ').map(n => n[0]).join('')}
                    </Avatar>

                    <Divider orientation="vertical" flexItem />

                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {contact.name}
                        </Typography>
                        <Typography variant="h6" color="text.secondary">
                          {contact.role}
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Button
                          href={`mailto:${contact.email}`}
                          size="medium"
                          startIcon={<EmailIcon />}
                          sx={{ 
                            textTransform: 'none', 
                            fontSize: '1rem',
                            fontWeight: 500 
                          }}
                        >
                          {contact.email}
                        </Button>
                      </Box>

                      {(contact.officeHours || contact.officeLocation) && (
                        <Stack 
                          direction={{ xs: 'column', sm: 'row' }} 
                          spacing={{ xs: 1, sm: 3 }}
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                        >
                          {contact.officeHours && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <ScheduleIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                  Office Hours
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                                  {contact.officeHours}
                                </Typography>
                              </Box>
                            </Box>
                          )}

                          {contact.officeLocation && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LocationIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                  Office Location
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                                  {contact.officeLocation}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                        </Stack>
                      )}
                    </Box>

                    <Button
                      variant="contained"
                      color="error"
                      href={`mailto:${contact.email}`}
                      startIcon={<EmailIcon />}
                      size="large"
                      sx={{ 
                        minWidth: 180,
                        height: 48,
                        fontSize: '1rem'
                      }}
                    >
                      Report Bug
                    </Button>
                  </Stack>
                </CardContent>
              </ThemedCard>
            ))}
          </Stack>
        </>
      )}

      {/* Add/Edit contact dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add New Contact' : 'Edit Contact'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1, pb: 2 }}>
            <TextField
              name="name"
              label="Name"
              value={newContact.name}
              onChange={handleInputChange}
              fullWidth
              required
              placeholder="e.g., Dr. John Smith"
            />
            
            <TextField
              name="role"
              select
              label="Role"
              value={newContact.role}
              onChange={handleInputChange}
              fullWidth
            >
              {roleOptions.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              name="email"
              label="Email"
              type="email"
              value={newContact.email}
              onChange={handleInputChange}
              fullWidth
              required
              placeholder="e.g., john.smith@university.edu"
            />

            <TextField
              name="officeHours"
              label="Office Hours"
              value={newContact.officeHours}
              onChange={handleInputChange}
              fullWidth
              placeholder="e.g., Mon/Wed 2:00-4:00 PM"
              helperText="Optional"
            />

            <TextField
              name="officeLocation"
              label="Office Location"
              value={newContact.officeLocation}
              onChange={handleInputChange}
              fullWidth
              placeholder="e.g., West Building, Room 305"
              helperText="Optional"
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 1 }}>
              <input
                type="checkbox"
                name="forBugReports"
                id="forBugReports"
                checked={newContact.forBugReports}
                onChange={handleInputChange}
              />
              <label htmlFor="forBugReports">
                <Typography variant="body2">
                  This is for Technical Support / Bug Reports
                </Typography>
              </label>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveContact} variant="contained" color="primary">
            {dialogMode === 'add' ? 'Add Contact' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}