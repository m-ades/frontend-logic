import {
  Box,
  Typography,
  CardContent,
  Stack,
  Avatar,
  Button,
  Chip,
  Divider,
  CardActions
} from '@mui/material'
import ThemedCard from '../components/ui/ThemedCard.jsx'
import {
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material'
import { useState } from 'react'

export default function Contact({ isInstructorView = false }) {
  // Mock contact data
  const [contacts, setContacts] = useState([
    {
      id: 1,
      name: "Yuna Won",
      role: "Instructor",
      email: "yw1268@hunter.cuny.edu",
      officeHours: "11-12:30 on Fridays and by appointment.",
      officeLocation: "Hunter West 1447",
    },
    {
      id: 2,
      name: "Mariya Adesman",
      role: "Tutor",
      email: "mariya.adesman@hunter.cuny.edu",
      officeHours: "Mondays: 9-11am; 3-6pm / Wednesdays: 9-11am, 3-6pm",
      officeLocation: "Hunter West 1409",
    },
    {
      id: 3,
      name: "Miah Kurton",
      role: "Tutor",
      email: " miah.kirton74@myhunter.cuny.edu",
      officeHours: "Tuesdays: 11:50am-2:20pm / Thursdays: 11:50am-2:20pm (will change to 4:45-7:15pm)",
      officeLocation: "Hunter West 1409",
    },
    {
      id: 4,
      name: "Mariya Adesman",
      role: "Technical Support",
      email: "mariya.adesman@hunter.cuny.edu",
      officeHours: "Fridays: 10am-3pm",
      officeLocation: "Remote",
      forBugReports: true
    },
    {
      id: 5,
      name: "Alifahmed Uddin",
      role: "Technical Support",
      email: "alifahmed.uddin36@myhunter.cuny.edu",
      officeHours: "-",
      officeLocation: "Remote",
      forBugReports: true
    }
  ])

  // Separate regular contacts and bug report contacts
  const regularContacts = contacts.filter(contact => !contact.forBugReports)
  const bugReportContacts = contacts.filter(contact => contact.forBugReports)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Contact Staff
        </Typography>
        
        {isInstructorView && (
          <Box sx={{ height: 36 }} />
        )}
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        Find contact information for professors, teaching assistants, and support staff.
        Click on email addresses to send messages.
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
        <strong>Note:</strong> Please allow 1 business day for response
      </Typography>

      {/* Part 1: Regular contacts */}
      {regularContacts.length > 0 && (
        <Stack spacing={3} sx={{ mb: 4 }}>
          {regularContacts.map((contact) => (
            <ThemedCard key={contact.id}>
              {/* Edit and Delete buttons - only show in instructor view */}
              {isInstructorView && (
                <CardActions sx={{ justifyContent: 'flex-end', p: 1, pb: 0 }} />
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
                  <CardActions sx={{ justifyContent: 'flex-end', p: 1, pb: 0 }} />
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
    </Box>
  )
}