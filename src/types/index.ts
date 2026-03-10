export type HealthResponse = {
  status: "ok";
  service: string;
  timestamp: string;
};

export type RegistrationCreateResponse = {
  registrationId: string;
  telegramDeepLink: string;
  telegramLinkExpiresAt: string;
};
