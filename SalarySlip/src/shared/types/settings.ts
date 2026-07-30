export interface CompanyProfile {
  name: string;
  legalName: string;
  addressShort: string;
  addressLines: string[];
}

export interface SlipDefaults {
  bankName: string;
  bankAccountNo: string;
  pfAccountNo: string;
  footNote: string;
}

export interface CurrentUser {
  initials: string;
  name: string;
  email: string;
}

/** Org configuration, served by GET /api/settings. */
export interface AppSettings {
  company: CompanyProfile;
  payPeriod: string;
  standardDays: number;
  departments: string[];
  slipDefaults: SlipDefaults;
  currentUser: CurrentUser;
}
