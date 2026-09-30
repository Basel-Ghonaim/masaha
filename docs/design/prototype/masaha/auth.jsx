const { Button: AButton, Field: AField, Input: AInput, InputAction: AInputAction, Alert: AAlert, AlertTitle: AAlertTitle, AlertDescription: AAlertDescription, AlertAction: AAlertAction, LanguageToggle: ALanguageToggle, ThemeToggle: AThemeToggle, CircleCheckIcon: ACircleCheck, CircleAlertIcon: ACircleAlert, EyeIcon: AEye, EyeOffIcon: AEyeOff } = window.MasahaDesignSystem;

const nextUrl = () => pageParams.get('next') || 'Home.html';
const finishAuth = (...toasts) => { setUser(window.__pendingUser || { ...DEMO_USER, method: 'email' }); handOffToast(...toasts); location.href = carryParams(nextUrl()); };
const withNext = (page) => (pageParams.get('next') ? `${page}?next=${encodeURIComponent(pageParams.get('next'))}` : page);
const RATE_LIMIT = tr("محاولات كثيرة، حاول بعد 15 دقيقة", "Too many attempts, try again in 15 minutes");
const EMAIL_RE = /^\S+@\S+\.\S+$/;

function AuthShell({ theme, setTheme, children }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-8">
        <a href="Home.html" className="text-heading-3 text-primary">{tr("مساحة", "Masaha")}</a>
        <div className="flex items-center gap-2">
          <ALanguageToggle lang={LANG === 'en' ? 'ar' : 'en'} label={LANG === 'en' ? 'العربية' : 'English'} onClick={switchLang} />
          <AThemeToggle theme={theme} onThemeChange={setTheme} label={theme === 'light' ? tr("المظهر الداكن", "Dark theme") : tr("المظهر الفاتح", "Light theme")} />
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 py-6 md:items-center md:justify-center md:px-8 md:py-16">{children}</main>
      <PageToaster />
    </div>
  );
}

// Google's own mark and neutral button (their branding rules) — the only non-DS element.
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function GoogleButton({ onClick, busy }) {
  return (
    <button type="button" className="gsi-button" onClick={onClick} disabled={busy} aria-busy={busy}>
      <GoogleG />
      <span>{busy ? tr("جارٍ المتابعة باستخدام Google…", "Continuing with Google…") : tr("المتابعة باستخدام Google", "Continue with Google")}</span>
    </button>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label={tr("أو", "or")}>
      <span className="h-px flex-1 bg-border"></span>
      <span className="text-caption text-muted-foreground" aria-hidden="true">{tr("أو", "or")}</span>
      <span className="h-px flex-1 bg-border"></span>
    </div>
  );
}

// Demo: ?google=error | linked; otherwise a first Google sign-in creates the account.
function useGoogleSignIn() {
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(pageParams.get('google') === 'error');
  const start = () => {
    setFailed(false); setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const mode = pageParams.get('google');
      if (mode === 'fail') return setFailed(true);
      window.__pendingUser = { ...DEMO_USER, method: mode === 'linked' ? 'linked' : 'google' };
      if (mode === 'linked') return finishAuth(tr("ربطنا حساب Google بحسابك", "We linked your Google account to your account"));
      finishAuth(tr("أهلًا سارة، تم إنشاء حسابك", "Welcome Sara, your account is ready"));
    }, 1000);
  };
  return { busy, failed, start };
}

function GoogleBlock({ google }) {
  return (
    <div className="flex flex-col gap-4">
      {google.failed && (
        <AAlert variant="destructive">
          <AAlertDescription>{tr("تعذّر تسجيل الدخول باستخدام Google، حاول مرة أخرى أو استخدم البريد الإلكتروني.", "We couldn’t sign you in with Google. Try again or use your email.")}</AAlertDescription>
        </AAlert>
      )}
      <GoogleButton onClick={google.start} busy={google.busy} />
      <OrDivider />
    </div>
  );
}

const PASSWORD_RULES = [
  { id: 'len', label: tr("8 أحرف على الأقل", "At least 8 characters"), test: (v) => v.length >= 8 },
  { id: 'letter', label: tr("حرف واحد على الأقل", "At least one letter"), test: (v) => /[A-Za-z\u0600-\u06FF]/.test(v) },
  { id: 'digit', label: tr("رقم واحد على الأقل", "At least one number"), test: (v) => /[0-9\u0660-\u0669]/.test(v) }
];
const passwordOk = (v) => PASSWORD_RULES.every((r) => r.test(v));

// Met → success tick. After a submit, unmet rules turn to the error colour.
function PasswordRules({ value, id, submitted }) {
  return (
    <ul id={id} className="flex flex-col gap-1" aria-label={tr("شروط كلمة المرور", "Password rules")}>
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value);
        const bad = !ok && submitted;
        return (
          <li key={r.id} className={'flex items-center gap-2 text-caption ' + (ok ? 'text-foreground' : bad ? 'text-destructive' : 'text-muted-foreground')}>
            {ok ? <ACircleCheck className="size-4 text-success" aria-hidden="true" /> : bad ? <ACircleAlert className="size-4 text-destructive" aria-hidden="true" /> : <span className="size-4 rounded-full border border-input" aria-hidden="true"></span>}
            {r.label}<span className="sr-only">{ok ? tr(" — تحقّق", " — met") : tr(" — لم يتحقّق بعد", " — not met yet")}</span>
          </li>
        );
      })}
    </ul>
  );
}

function PasswordField({ label, value, onChange, error, disabled, autoComplete = 'new-password', rules = true, submitted }) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="flex flex-col gap-2">
      <AField label={label} error={error}>
        <AInput type={show ? 'text' : 'password'} dir="ltr" autoComplete={autoComplete} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} aria-describedby={rules ? 'password-rules' : undefined}
          action={<AInputAction label={show ? tr("إخفاء كلمة المرور", "Hide password") : tr("إظهار كلمة المرور", "Show password")} icon={show ? <AEyeOff /> : <AEye />} onClick={() => setShow(!show)} />} />
      </AField>
      {rules && <PasswordRules value={value} id="password-rules" submitted={submitted || !!error} />}
    </div>
  );
}

function NetworkAlert({ onRetry }) {
  return (
    <AAlert variant="destructive">
      <AAlertTitle>{tr("تعذّر الاتصال", "Couldn’t connect")}</AAlertTitle>
      <AAlertDescription>{tr("تحقّق من اتصالك بالإنترنت ثم حاول مرة أخرى.", "Check your internet connection and try again.")}</AAlertDescription>
      <AAlertAction><AButton variant="outline" size="sm" onClick={onRetry}>{tr("إعادة المحاولة", "Try again")}</AButton></AAlertAction>
    </AAlert>
  );
}

function RateLimitAlert() {
  return <AAlert variant="warning"><AAlertDescription>{RATE_LIMIT}</AAlertDescription></AAlert>;
}

Object.assign(window, { AuthShell, GoogleButton, GoogleBlock, OrDivider, useGoogleSignIn, PasswordRules, PasswordField, passwordOk, NetworkAlert, RateLimitAlert, finishAuth, withNext, nextUrl, EMAIL_RE, RATE_LIMIT });
