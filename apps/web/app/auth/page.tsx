import type { Metadata } from "next";

// Icons
import Logo from "@/public/logo.svg";
import Ticket from "@/public/ticket.svg";

// Components
import GoogleButton from "@/components/auth/GoogleButton";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Autenticação",
};

export default function LoginPage() {
	return <div className="flex min-h-screen flex-col md:flex-row"></div>;
}
