import { redirect } from "next/navigation";

// Moved into Settings; old links (and their #services anchor) land there
export default function Page() {
  redirect("/settings/profile");
}
