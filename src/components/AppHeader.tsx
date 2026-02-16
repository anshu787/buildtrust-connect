import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Building2, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import NotificationBell from "@/components/NotificationBell";

export default function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="border-b bg-card">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold">ConQuote</span>
        </Link>
        <div className="flex items-center gap-3">
          {user && <NotificationBell userId={user.id} />}
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
