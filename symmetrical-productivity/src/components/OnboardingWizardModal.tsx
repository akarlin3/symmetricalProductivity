import React from 'react';
import { ProfilePresetModal, ProfilePresetModalProps } from './ProfilePresetModal';

export type OnboardingWizardModalProps = ProfilePresetModalProps;

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = (props) => {
  return <ProfilePresetModal {...props} />;
};
