export function AuthFooter() {
  return (
    <p className="mt-8 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} AutoFiveStar. Powered by{" "}
      <a
        href="https://www.tweakandbuild.com"
        target="_blank"
        rel="noopener noreferrer"
        className="underline-offset-2 hover:text-primary hover:underline"
      >
        Tweak &amp; Build
      </a>
      .
    </p>
  );
}
