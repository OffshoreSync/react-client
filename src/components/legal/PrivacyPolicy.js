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

const PrivacyPolicy = ({ open, onClose }) => {
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
      <DialogTitle>{t('legal.privacyPolicy.title')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" paragraph>
          {t('legal.privacyPolicy.lastUpdated')}
        </Typography>

        {/* Information Collection */}
        <Typography variant="h6" gutterBottom>
          {t('legal.privacyPolicy.sections.informationCollect.title')}
        </Typography>
        <Typography variant="body1">
          {t('legal.privacyPolicy.sections.informationCollect.intro')}
        </Typography>
        <BulletList items={t('legal.privacyPolicy.sections.informationCollect.items', { returnObjects: true })} />

        {/* Information Use */}
        <Typography variant="h6" gutterBottom>
          {t('legal.privacyPolicy.sections.informationUse.title')}
        </Typography>
        <Typography variant="body1">
          {t('legal.privacyPolicy.sections.informationUse.intro')}
        </Typography>
        <BulletList items={t('legal.privacyPolicy.sections.informationUse.items', { returnObjects: true })} />

        {/* Third-Party Services */}
        <Typography variant="h6" gutterBottom>
          {t('legal.privacyPolicy.sections.thirdPartyServices.title')}
        </Typography>
        <Typography variant="body1">
          {t('legal.privacyPolicy.sections.thirdPartyServices.intro')}
        </Typography>
        <BulletList items={t('legal.privacyPolicy.sections.thirdPartyServices.services', { returnObjects: true })} />
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1">
            {t('legal.privacyPolicy.sections.thirdPartyServices.privacyPoliciesIntro')}
          </Typography>
          <BulletList items={[
            <span>Render: <Link href={t('legal.privacyPolicy.sections.thirdPartyServices.privacyPolicies.render')} target="_blank" rel="noopener noreferrer">{t('legal.privacyPolicy.sections.thirdPartyServices.privacyPolicies.render')}</Link></span>,
            <span>Cloudflare: <Link href={t('legal.privacyPolicy.sections.thirdPartyServices.privacyPolicies.cloudflare')} target="_blank" rel="noopener noreferrer">{t('legal.privacyPolicy.sections.thirdPartyServices.privacyPolicies.cloudflare')}</Link></span>,
            <span>Amazon SES: <Link href={t('legal.privacyPolicy.sections.thirdPartyServices.privacyPolicies.amazonSes')} target="_blank" rel="noopener noreferrer">{t('legal.privacyPolicy.sections.thirdPartyServices.privacyPolicies.amazonSes')}</Link></span>,
            <span>GitHub: <Link href={t('legal.privacyPolicy.sections.thirdPartyServices.privacyPolicies.github')} target="_blank" rel="noopener noreferrer">{t('legal.privacyPolicy.sections.thirdPartyServices.privacyPolicies.github')}</Link></span>,
            <span>Google: <Link href={t('legal.privacyPolicy.sections.thirdPartyServices.privacyPolicies.google')} target="_blank" rel="noopener noreferrer">{t('legal.privacyPolicy.sections.thirdPartyServices.privacyPolicies.google')}</Link></span>
          ]} />
        </Box>

        {/* Information Sharing */}
        <Typography variant="h6" gutterBottom>
          {t('legal.privacyPolicy.sections.informationSharing.title')}
        </Typography>
        <Typography variant="body1">
          {t('legal.privacyPolicy.sections.informationSharing.intro')}
        </Typography>
        <BulletList items={t('legal.privacyPolicy.sections.informationSharing.items', { returnObjects: true })} />

        {/* Data Processing */}
        <Typography variant="h6" gutterBottom>
          {t('legal.privacyPolicy.sections.dataProcessing.title')}
        </Typography>
        <Typography variant="body1" paragraph>
          {t('legal.privacyPolicy.sections.dataProcessing.content')}
        </Typography>

        {/* Data Security */}
        <Typography variant="h6" gutterBottom>
          {t('legal.privacyPolicy.sections.dataSecurity.title')}
        </Typography>
        <Typography variant="body1" paragraph>
          {t('legal.privacyPolicy.sections.dataSecurity.content')}
        </Typography>

        {/* User Rights */}
        <Typography variant="h6" gutterBottom>
          {t('legal.privacyPolicy.sections.userRights.title')}
        </Typography>
        <Typography variant="body1">
          {t('legal.privacyPolicy.sections.userRights.intro')}
        </Typography>
        <BulletList items={t('legal.privacyPolicy.sections.userRights.items', { returnObjects: true })} />

        {/* Contact */}
        <Typography variant="h6" gutterBottom>
          {t('legal.privacyPolicy.sections.contact.title')}
        </Typography>
        <Typography variant="body1" paragraph>
          {t('legal.privacyPolicy.sections.contact.content')}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrivacyPolicy;
