import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Upload, Save, ExternalLink, Star, ShieldCheck, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import WalletConnect from "@/components/WalletConnect";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [reviewStats, setReviewStats] = useState({ count: 0, avg: 0 });
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [profileRes, reviewsRes, projectsRes] = await Promise.all([
        supabase.from("profiles").select("company_name, contact_info, avatar_url, wallet_address").eq("user_id", user.id).single(),
        supabase.from("reviews").select("rating").eq("reviewee_id", user.id),
        supabase.from("projects").select("id").eq("builder_id", user.id),
      ]);
      if (profileRes.data) {
        setCompanyName(profileRes.data.company_name || "");
        setContactInfo(profileRes.data.contact_info || "");
        setAvatarUrl(profileRes.data.avatar_url);
        setWalletAddress(profileRes.data.wallet_address || null);
      }
      const reviews = (reviewsRes.data as any[]) || [];
      setReviewStats({
        count: reviews.length,
        avg: reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : 0,
      });
      setProjectCount((projectsRes.data || []).length);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 2MB allowed.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${publicData.publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);
    await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
    toast({ title: "Avatar updated" });
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      company_name: companyName.trim() || null,
      contact_info: contactInfo.trim() || null,
    }).eq("user_id", user.id);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved" });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const verified = reviewStats.count >= 1 && reviewStats.avg >= 4;

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Profile & Settings</h1>
          <p className="text-muted-foreground">Manage your account details.</p>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-1">
          <Link to={`/user/${user!.id}`}>
            <ExternalLink className="h-3.5 w-3.5" /> View Public Profile
          </Link>
        </Button>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="py-4">
            <p className="text-2xl font-bold text-primary">{projectCount}</p>
            <p className="text-xs text-muted-foreground">Projects</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-1">
              <Star className="h-4 w-4 fill-chart-3 text-chart-3" />
              <span className="text-2xl font-bold text-chart-3">{reviewStats.avg > 0 ? reviewStats.avg.toFixed(1) : "—"}</span>
            </div>
            <p className="text-xs text-muted-foreground">{reviewStats.count} Reviews</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4">
            {verified ? (
              <Badge variant="outline" className="gap-1 border-accent text-accent">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Briefcase className="h-3.5 w-3.5" /> Unverified
              </Badge>
            )}
            <p className="text-xs text-muted-foreground mt-1">Badge Status</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>Update your company information and avatar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="Avatar" /> : null}
              <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload Photo
              </Label>
              <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              <p className="text-xs text-muted-foreground mt-1">Max 2MB, JPG/PNG</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company Name</Label>
            <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company name" maxLength={100} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact Info</Label>
            <Input id="contact" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="Phone number or other contact" maxLength={200} />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blockchain Wallet</CardTitle>
          <CardDescription>Connect your MetaMask wallet for on-chain escrow and NFT certificates.</CardDescription>
        </CardHeader>
        <CardContent>
          <WalletConnect userId={user!.id} walletAddress={walletAddress} onConnected={setWalletAddress} />
        </CardContent>
      </Card>
    </div>
  );
}
