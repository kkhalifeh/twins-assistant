export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
}

export interface Child {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  photoUrl?: string;
  medicalNotes?: string;
}

export interface FeedingLog {
  id: string;
  childId: string;
  child?: Child;
  userId: string;
  user?: User;
  startTime: string;
  endTime?: string;
  type: 'BREAST' | 'BOTTLE' | 'FORMULA' | 'MIXED' | 'SOLID';
  amount?: number;
  duration?: number;
  notes?: string;
  createdAt: string;
}

export interface SleepLog {
  id: string;
  childId: string;
  child?: Child;
  userId: string;
  user?: User;
  startTime: string;
  endTime?: string;
  duration?: number;
  type: 'NAP' | 'NIGHT';
  quality?: 'DEEP' | 'RESTLESS' | 'INTERRUPTED';
  notes?: string;
  createdAt: string;
}

export interface DiaperLog {
  id: string;
  childId: string;
  child?: Child;
  userId: string;
  user?: User;
  timestamp: string;
  type: 'WET' | 'DIRTY' | 'MIXED';
  consistency?: 'NORMAL' | 'WATERY' | 'HARD';
  color?: string;
  notes?: string;
  createdAt: string;
}

export interface HealthLog {
  id: string;
  childId: string;
  child?: Child;
  userId: string;
  user?: User;
  timestamp: string;
  type: 'TEMPERATURE' | 'MEDICINE' | 'WEIGHT' | 'HEIGHT' | 'VACCINATION' | 'SYMPTOM';
  value: string;
  unit?: string;
  notes?: string;
  createdAt: string;
}
