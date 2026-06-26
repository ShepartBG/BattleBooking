import { ReactNode } from "react";

type PageProps = {
  children: ReactNode;
};

export default function Page({ children }: PageProps) {
  return <main className="bb-page-bg min-h-screen text-white">{children}</main>;
}
