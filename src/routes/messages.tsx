import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/layout/AppShell";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — Fit Force Gym" }] }),
  component: Messages,
});

const templates = [
  { name: "Membership Expiry", text: "Hi {{name}}, your {{plan}} membership at Fit Force Gym expires on {{date}}. Renew now to avoid interruption! 💪" },
  { name: "Payment Receipt", text: "Hi {{name}}, payment of ₹{{amount}} received for {{plan}}. Thank you! 🏋️" },
  { name: "Birthday Wish", text: "Happy Birthday {{name}}! 🎂 Wishing you a fit and healthy year ahead. — Fit Force Gym" },
  { name: "Welcome Message", text: "Welcome to Fit Force Gym, {{name}}! Your {{plan}} membership starts today. 💪" },
  { name: "Attendance Alert", text: "Hi {{name}}, we miss you! It's been {{days}} days since your last visit. Keep your streak going 🔥" },
];

function Messages() {
  return (
    <AppShell title="WhatsApp & SMS">
      <Card className="!p-4 mb-4 flex items-center gap-3 bg-primary/10 border-primary/30">
        <MessageCircle className="w-8 h-8 text-primary" />
        <div className="flex-1">
          <div className="text-sm font-semibold">Bulk Messaging</div>
          <div className="text-xs text-muted-foreground">Send to all members at once</div>
        </div>
        <button onClick={() => toast.success("Will send to 47 members")} className="text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center gap-1"><Send className="w-3 h-3" />Send</button>
      </Card>

      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Message Templates</h3>
      <div className="space-y-3">
        {templates.map((t) => (
          <Card key={t.name} className="!p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">{t.name}</div>
              <label className="relative inline-block w-9 h-5">
                <input type="checkbox" defaultChecked className="peer sr-only" />
                <span className="absolute inset-0 rounded-full bg-secondary peer-checked:bg-primary transition" />
                <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white peer-checked:translate-x-4 transition" />
              </label>
            </div>
            <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{t.text}</div>
            <div className="flex gap-2 mt-3">
              <button className="text-[11px] px-3 py-1.5 rounded-lg border border-border">Edit</button>
              <button onClick={() => toast.success("Test sent")} className="text-[11px] px-3 py-1.5 rounded-lg border border-border">Send Test</button>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
