import { useState } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../state/auth';
import { Button, Field, Logo } from '../ui';

// Вход по логину/паролю — только вне Telegram (внутри авторизует initData).
export function LoginScreen() {
  const { t } = useI18n();
  const { login } = useAuth();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const canSubmit = loginValue.trim().length > 0 && password.length > 0;

  const submit = async () => {
    if (!canSubmit || pending) return;
    setPending(true);
    setFailed(false);
    const ok = await login(loginValue.trim(), password);
    setPending(false);
    if (!ok) setFailed(true);
  };

  return (
    <div className="flex min-h-dvh flex-col justify-center gap-6 px-6 pb-16">
      <div className="flex flex-col items-center gap-3">
        <Logo size={28} />
        <div className="text-center text-[14px] leading-normal text-ink3">
          {t.loginSubtitle}
        </div>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field
          label={t.loginLabel}
          value={loginValue}
          onChange={setLoginValue}
          placeholder={t.loginLabel}
        />
        <Field
          label={t.passwordLabel}
          value={password}
          onChange={setPassword}
          placeholder={t.passwordLabel}
          type="password"
        />
        {failed && (
          <div className="px-1 text-[13px] text-accent">{t.loginError}</div>
        )}
        <Button type="submit" disabled={!canSubmit || pending}>
          {t.signIn}
        </Button>
      </form>
    </div>
  );
}
