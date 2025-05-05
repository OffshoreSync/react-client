import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Container,
  Typography,
  List,
  ListItem,
  Box,
  Link,
  Paper
} from '@mui/material';

const TermsPage = () => {
  const { t } = useTranslation();

  const BulletList = ({ items }) => (
    <List sx={{ pl: 2, '& .MuiListItem-root': { display: 'list-item' } }}>
      {Array.isArray(items) && items.map((item, index) => (
        <ListItem key={index} sx={{ pl: 1 }}>
          <Typography variant="body1">{item}</Typography>
        </ListItem>
      ))}
    </List>
  );

  const sections = t('legal.termsAndConditions.sections', { returnObjects: true });

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('legal.termsAndConditions.title')}
        </Typography>

        <Typography variant="body1" paragraph>
          {t('legal.termsAndConditions.lastUpdated')}
        </Typography>

        {sections && Object.entries(sections).map(([key, section]) => (
          <Box key={key} sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {section.title}
            </Typography>
            
            {section.intro && (
              <Typography variant="body1" paragraph>
                {section.intro}
              </Typography>
            )}

            {section.items && (
              <BulletList items={section.items} />
            )}

            {section.content && (
              <Typography variant="body1" paragraph>
                {section.content}
              </Typography>
            )}

            {section.services && (
              <>
                <BulletList items={section.services} />
                {section.acknowledgment && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body1" paragraph>
                      {section.acknowledgment.intro}
                    </Typography>
                    <BulletList items={section.acknowledgment.items} />
                  </Box>
                )}
                {section.privacyPoliciesIntro && (
                  <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                    {section.privacyPoliciesIntro}
                  </Typography>
                )}
                {section.privacyPolicies && (
                  <List sx={{ pl: 2 }}>
                    {Object.entries(section.privacyPolicies).map(([service, url]) => (
                      <ListItem key={service} sx={{ pl: 1 }}>
                        <Link 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          sx={{ textTransform: 'capitalize' }}
                        >
                          {service} Privacy Policy
                        </Link>
                      </ListItem>
                    ))}
                  </List>
                )}
              </>
            )}
          </Box>
        ))}

        <Box mt={4}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} OffshoreSync
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default TermsPage;
