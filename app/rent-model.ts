export interface MonthlyArrearsRecord {
  roomCode: string;
  sageAccountId: string;
  staffName: string;
  tenantName: string;
  weeklyRentAmount: number;
  currency: string;
  week1PaidAmount: number;
  week2PaidAmount: number;
  week3PaidAmount: number;
  week4PaidAmount: number;
  carriedOverFromPreviousMonthAmount: number;
  monthTotalPaidAmount: number;
  monthArrearsAmount: number;
  yearArrearsAmount: number;
  currentArrearsAmount: number;
  periodMonth: string;
  snapshotDate: string;
  audit?: MonthlyAudit;
}

export interface MonthlyAudit {
  weeklyRent: {
    method: string;
    chosen: number;
    candidates: Array<{ amount: number; count: number }>;
  };
  weeks: Array<{
    year: number;
    weekNumber: number;
    amount: number;
    sources: Array<{
      file: string;
      transactionNo: string;
      date: string;
      reference: string;
      amount: number;
    }>;
  }>;
}

export interface TransactionSaCash {
  year: number;
  weekNumber: number;
  periodMonth: string;
  roomCode: string;
  tenantName: string;
  transactionNo: string;
  date: string;
  reference: string;
  type: string;
  details: string;
  amount: number;
}

export interface Tenant {
  tenantName: string;
  roomCode: string;
  staffName: string;
}

export const sampleMonthlyArrears: MonthlyArrearsRecord[] = [
  {
    roomCode: "A04",
    sageAccountId: "40",
    staffName: "Kathleen McC",
    tenantName: "Heather C",
    weeklyRentAmount: 85.0,
    currency: "EUR",
    week1PaidAmount: 85.0,
    week2PaidAmount: 85.0,
    week3PaidAmount: 85.0,
    week4PaidAmount: 0,
    carriedOverFromPreviousMonthAmount: 0,
    monthTotalPaidAmount: 255.0,
    monthArrearsAmount: 170.0,
    yearArrearsAmount: 0,
    currentArrearsAmount: 0,
    periodMonth: "2026-01",
    snapshotDate: "2026-01-01",
  },
  {
    roomCode: "A05",
    sageAccountId: "190",
    staffName: "No one",
    tenantName: "Robert Cam",
    weeklyRentAmount: 41.0,
    currency: "EUR",
    week1PaidAmount: 0,
    week2PaidAmount: 50.0,
    week3PaidAmount: 50.0,
    week4PaidAmount: 0,
    carriedOverFromPreviousMonthAmount: 0,
    monthTotalPaidAmount: 100.0,
    monthArrearsAmount: 105.0,
    yearArrearsAmount: 0,
    currentArrearsAmount: 0,
    periodMonth: "2026-01",
    snapshotDate: "2026-01-01",
  },
  {
    roomCode: "A06",
    sageAccountId: "463",
    staffName: "Kathleen McC",
    tenantName: "Anna M",
    weeklyRentAmount: 35.0,
    currency: "EUR",
    week1PaidAmount: 35.0,
    week2PaidAmount: 35.0,
    week3PaidAmount: 0,
    week4PaidAmount: 0,
    carriedOverFromPreviousMonthAmount: 105.0,
    monthTotalPaidAmount: 70.0,
    monthArrearsAmount: 105.0,
    yearArrearsAmount: 0,
    currentArrearsAmount: 0,
    periodMonth: "2026-01",
    snapshotDate: "2026-01-01",
  },
];
