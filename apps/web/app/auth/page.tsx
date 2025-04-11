import LeftPanel from "../../components/auth/LeftPanel";
import RightPanel from "../../components/auth/RightPanel";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <LeftPanel />
      <RightPanel />
    </div>
  );
}
