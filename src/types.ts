export type UserRole = 'student' | 'parent' | 'teacher' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  rollNo: string;
  email: string;
  role: UserRole;
  class?: string;
  age?: number;
  hobbies?: string[];
  parentOf?: string; // Student UID
}

export interface Activity {
  id?: string;
  studentUid: string;
  teacherUid: string;
  title: string;
  type: 'homework' | 'assignment' | 'project';
  dueDate: string;
  status: 'assigned' | 'submitted' | 'graded';
  submission?: string;
  gradedScore?: number;
  remarks?: string;
}

export interface Goal {
  id?: string;
  studentUid: string;
  teacherUid: string;
  title: string;
  status: 'pending' | 'completed';
  date: string;
}

export interface Attendance {
  id?: string;
  studentUid: string;
  date: string;
  isPresent: boolean;
}

export interface StudyLog {
  id?: string;
  studentUid: string;
  date: string;
  durationMinutes: number;
}

export interface Badge {
  id?: string;
  studentUid: string;
  type: string;
  receivedAt: string;
  reason: string;
}
