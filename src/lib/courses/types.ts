export interface Lesson {
  day: number;
  subject: string;
  body: string;
  cta: string;
}

export interface Course {
  slug: string;
  title: string;
  subtitle: string;
  duration: string;
  audience: string;
  outcome: string;
  lessons: Lesson[];
  capstone: string;
}
