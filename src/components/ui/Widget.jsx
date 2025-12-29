import { Paper, Box } from '@mui/material'
import { Typography } from '@mui/material'

export default function Widget({
  children,
  title,
  subtitle,
  noBodyPadding = false,
  bodyClass,
  disableWidgetMenu,
  header,
  inheritHeight,
  className,
  style,
  ...props
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: inheritHeight ? 'auto' : undefined,
        ...style,
      }}
      className={className}
    >
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          width: '100%',
          boxShadow: (theme) => theme.customShadows?.widget || '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        }}
      >
        {title && (
          <Box
            sx={{
              padding: 3,
              paddingBottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              width="100%"
            >
              <Box display="flex" sx={{ width: 'calc(100% - 20px)' }}>
                <Typography 
                  variant="h4" 
                  sx={{ color: 'text.secondary' }}
                  noWrap
                >
                  {title}
                </Typography>
                {subtitle && (
                  <Box alignSelf="flex-end" ml={1}>
                    <Typography 
                      sx={{ color: 'text.hint' }}
                      variant="caption"
                    >
                      {subtitle}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}
        {header && !title && (
          <Box
            sx={{
              padding: 3,
              paddingBottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {header}
          </Box>
        )}
        <Box
          sx={{
            padding: noBodyPadding ? 0 : 3,
            paddingTop: noBodyPadding ? 0 : 1,
            ...(bodyClass || {}),
          }}
        >
          {children}
        </Box>
      </Paper>
    </Box>
  )
}
