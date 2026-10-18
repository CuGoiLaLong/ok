export interface User {
  username: string;
  name: string;
  role: string;
  institution: string;
  avatar: string;
  accessLevel: string;
}

export type ExperimentType =
  | 'pendulum'
  | 'projectile'
  | 'optics'
  | 'circuit'
  | 'brownian'
  | 'waves';

export interface ExperimentInfo {
  id: ExperimentType;
  title: string;
  category: 'Cơ học' | 'Quang học' | 'Điện từ học' | 'Vật lý Sinh học & Nhiệt';
  shortDesc: string;
  icon: string;
  keyFormula: string;
  tags: string[];
}

export type AIMode = 'deep-thinking' | 'general' | 'fast';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  mode?: AIMode;
  modelUsed?: string;
  timestamp: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LabNote {
  id: string;
  timestamp: string;
  experimentId: ExperimentType;
  title: string;
  parameters: Record<string, any>;
  notes: string;
}
