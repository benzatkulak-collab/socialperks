export type ListicleItem = {
  emoji: string;
  title: string;
  body: string[];
  whyItWorks: string;
  specificTip: string;
};

export type Listicle = {
  slug: string;
  h1: string;
  title: string;
  description: string;
  topic: string;
  intro: string[];
  items: ListicleItem[];
  bonusTip: { title: string; body: string };
  commonMistakes: { title: string; body: string }[];
  cta: string;
  publishedAt: string;
};
