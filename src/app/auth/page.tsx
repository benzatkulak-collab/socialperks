import type { Metadata } from "next";
import { AuthPageClient } from "./auth-page-client";

export const metadata: Metadata = {
  title: "Sign up \u00B7 Social Perks",
  description:
    "Create your Social Perks account \u2014 turn customers into your marketing team with perks for posts, reviews, and referrals.",
};

export default function AuthPage() {
  return <AuthPageClient />;
}
