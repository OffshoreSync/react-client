import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography,
  List,
  ListItem,
  Box,
  Link
} from '@mui/material';

const TermsAndConditions = ({ open, onClose }) => {
  const { t } = useTranslation();

  const BulletList = ({ items }) => (
    <List sx={{ pl: 2, '& .MuiListItem-root': { display: 'list-item' } }}>
      {items.map((item, index) => (
        <ListItem key={index} sx={{ pl: 1 }}>
          <Typography variant="body1">{item}</Typography>
        </ListItem>
      ))}
    </List>
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle>{t('legal.termsAndConditions.title')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" paragraph>
          {t('legal.termsAndConditions.lastUpdated')}
        </Typography>

        {/* Acceptance */}
        <Typography variant="h6" gutterBottom>
          {t('legal.termsAndConditions.sections.acceptance.title')}
        </Typography>
        <Typography variant="body1" paragraph>
          {t('legal.termsAndConditions.sections.acceptance.content')}
        </Typography>

        {/* User Registration */}
        <Typography variant="h6" gutterBottom>
          {t('legal.termsAndConditions.sections.userRegistration.title')}
        </Typography>
        <BulletList items={t('legal.termsAndConditions.sections.userRegistration.items', { returnObjects: true })} />

        {/* User Conduct */}
        <Typography variant="h6" gutterBottom>
          {t('legal.termsAndConditions.sections.userConduct.title')}
        </Typography>
        <Typography variant="body1">
          {t('legal.termsAndConditions.sections.userConduct.intro')}
        </Typography>
        <BulletList items={t('legal.termsAndConditions.sections.userConduct.items', { returnObjects: true })} />

        {/* Third-Party Services */}
        <Typography variant="h6" gutterBottom>
          {t('legal.termsAndConditions.sections.thirdPartyServices.title')}
        </Typography>
        <Typography variant="body1">
          {t('legal.termsAndConditions.sections.thirdPartyServices.intro')}
        </Typography>
        <BulletList items={t('legal.termsAndConditions.sections.thirdPartyServices.services', { returnObjects: true })} />
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1">
            {t('legal.termsAndConditions.sections.thirdPartyServices.acknowledgment.intro')}
          </Typography>
          <BulletList items={t('legal.termsAndConditions.sections.thirdPartyServices.acknowledgment.items', { returnObjects: true })} />
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body1">
            {t('legal.termsAndConditions.sections.thirdPartyServices.privacyPoliciesIntro')}
          </Typography>
          <BulletList items={[
            <span>Render: <Link href={t('legal.termsAndConditions.sections.thirdPartyServices.privacyPolicies.render')} target="_blank" rel="noopener noreferrer">{t('legal.termsAndConditions.sections.thirdPartyServices.privacyPolicies.render')}</Link></span>,
            <span>Cloudflare: <Link href={t('legal.termsAndConditions.sections.thirdPartyServices.privacyPolicies.cloudflare')} target="_blank" rel="noopener noreferrer">{t('legal.termsAndConditions.sections.thirdPartyServices.privacyPolicies.cloudflare')}</Link></span>,
            <span>Amazon SES: <Link href={t('legal.termsAndConditions.sections.thirdPartyServices.privacyPolicies.amazonSes')} target="_blank" rel="noopener noreferrer">{t('legal.termsAndConditions.sections.thirdPartyServices.privacyPolicies.amazonSes')}</Link></span>,
            <span>GitHub: <Link href={t('legal.termsAndConditions.sections.thirdPartyServices.privacyPolicies.github')} target="_blank" rel="noopener noreferrer">{t('legal.termsAndConditions.sections.thirdPartyServices.privacyPolicies.github')}</Link></span>,
            <span>Google: <Link href={t('legal.termsAndConditions.sections.thirdPartyServices.privacyPolicies.google')} target="_blank" rel="noopener noreferrer">{t('legal.termsAndConditions.sections.thirdPartyServices.privacyPolicies.google')}</Link></span>
          ]} />
        </Box>

        {/* Service Availability */}
        <Typography variant="h6" gutterBottom>
          {t('legal.termsAndConditions.sections.serviceAvailability.title')}
        </Typography>
        <Typography variant="body1">
          {t('legal.termsAndConditions.sections.serviceAvailability.intro')}
        </Typography>
        <BulletList items={t('legal.termsAndConditions.sections.serviceAvailability.items', { returnObjects: true })} />

        {/* Data Processing */}
        <Typography variant="h6" gutterBottom>
          {t('legal.termsAndConditions.sections.dataProcessing.title')}
        </Typography>
        <Typography variant="body1">
          {t('legal.termsAndConditions.sections.dataProcessing.intro')}
        </Typography>
        <BulletList items={t('legal.termsAndConditions.sections.dataProcessing.items', { returnObjects: true })} />

        {/* Intellectual Property */}
        <Typography variant="h6" gutterBottom>
          {t('legal.termsAndConditions.sections.intellectualProperty.title')}
        </Typography>
        <BulletList items={t('legal.termsAndConditions.sections.intellectualProperty.items', { returnObjects: true })} />

        {/* Service Modifications */}
        <Typography variant="h6" gutterBottom>
          {t('legal.termsAndConditions.sections.serviceModifications.title')}
        </Typography>
        <Typography variant="body1">
          {t('legal.termsAndConditions.sections.serviceModifications.intro')}
        </Typography>
        <BulletList items={t('legal.termsAndConditions.sections.serviceModifications.items', { returnObjects: true })} />

        {/* Limitation of Liability */}
        <Typography variant="h6" gutterBottom>
          {t('legal.termsAndConditions.sections.limitationOfLiability.title')}
        </Typography>
        <BulletList items={t('legal.termsAndConditions.sections.limitationOfLiability.items', { returnObjects: true })} />

        {/* Contact */}
        <Typography variant="h6" gutterBottom>
          {t('legal.termsAndConditions.sections.contact.title')}
        </Typography>
        <Typography variant="body1" paragraph>
          {t('legal.termsAndConditions.sections.contact.content')}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TermsAndConditions;
