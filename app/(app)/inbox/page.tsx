import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming next</CardTitle>
          <CardDescription>
            The review inbox lights up once Google Business Profile is connected
            (PR #4) and the 15-minute review poller is wired (PR #5).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You'll get unanswered / rating / date filters, a review detail
          panel, and three AI draft variants per review.
        </CardContent>
      </Card>
    </div>
  );
}
