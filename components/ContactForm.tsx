"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  // 送信先メールアドレス。ビルド時に NEXT_PUBLIC_CONTACT_EMAIL で指定する
  contactEmail: string;
};

type Fields = {
  name: string;
  email: string;
  message: string;
};

type Errors = Partial<Record<keyof Fields, string>>;

const SUBJECT = "【サッカークイズ】お問い合わせ";
const CARD_CLASS =
  "animate-in fade-in slide-in-from-bottom-2 duration-300 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]";

function validate(fields: Fields): Errors {
  const errors: Errors = {};
  if (!fields.name.trim()) errors.name = "お名前を入力してください";
  if (!fields.email.trim()) {
    errors.email = "メールアドレスを入力してください";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors.email = "メールアドレスの形式が正しくありません";
  }
  if (!fields.message.trim()) errors.message = "お問い合わせ内容を入力してください";
  return errors;
}

// フォームの内容をメールソフトに引き渡すための mailto: リンクを組み立てる
function buildMailto(to: string, fields: Fields): string {
  const body = [
    `お名前：${fields.name.trim()}`,
    `メールアドレス：${fields.email.trim()}`,
    "",
    "お問い合わせ内容：",
    fields.message.trim(),
  ].join("\n");
  const params = new URLSearchParams({ subject: SUBJECT, body });
  // URLSearchParams は空白を + にするため、メールソフト向けに %20 へ直す
  return `mailto:${to}?${params.toString().replace(/\+/g, "%20")}`;
}

export default function ContactForm({ contactEmail }: Props) {
  const [fields, setFields] = useState<Fields>({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  function update<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = validate(fields);
    setErrors(result);
    if (Object.keys(result).length > 0) return;

    window.location.href = buildMailto(contactEmail, fields);
    setSent(true);
  }

  if (sent) {
    return (
      <Card className={CARD_CLASS}>
        <CardHeader className="gap-3">
          <Badge variant="outline" className="tracking-[0.28em] text-muted-foreground">
            CONTACT
          </Badge>
          <CardTitle className="text-2xl font-bold sm:text-3xl">
            <h1>メールソフトを開きました</h1>
          </CardTitle>
          <CardDescription className="text-base leading-relaxed sm:text-lg">
            入力内容を本文にしたメールが開いています。
            <br />
            内容を確認して、メールソフトから送信してください。
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col items-stretch gap-3 border-0 bg-transparent pt-0">
          <Button
            variant="outline"
            size="lg"
            className="h-14 w-full text-lg font-semibold"
            onClick={() => {
              setFields({ name: "", email: "", message: "" });
              setSent(false);
            }}
          >
            もう一度入力する
          </Button>
          <Button
            size="lg"
            className="h-14 w-full text-lg font-semibold"
            nativeButton={false} render={<Link href="/" />}
          >
            クイズに戻る
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="gap-3">
        <Badge variant="outline" className="tracking-[0.28em] text-muted-foreground">
          CONTACT
        </Badge>
        <CardTitle className="text-3xl font-bold tracking-wide sm:text-4xl">
          <h1>お問い合わせ</h1>
        </CardTitle>
        <CardDescription className="text-base leading-relaxed sm:text-lg">
          クイズへのご意見・ご質問はこちらからお送りください。
          <br />
          送信ボタンを押すと、入力内容を本文にしたメールがメールソフトで開きます。
        </CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-6">
          {!contactEmail && (
            <p
              role="status"
              className="rounded-lg border border-wrong/50 bg-wrong/10 px-4 py-3 text-base text-wrong"
            >
              送信先メールアドレスが設定されていません。ビルド時に NEXT_PUBLIC_CONTACT_EMAIL を指定してください。
            </p>
          )}

          <Field id="name" label="お名前" error={errors.name}>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              value={fields.name}
              onChange={(e) => update("name", e.target.value)}
              aria-invalid={Boolean(errors.name)}
              className="h-14 px-4 text-lg md:text-lg"
            />
          </Field>

          <Field id="email" label="メールアドレス" error={errors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={fields.email}
              onChange={(e) => update("email", e.target.value)}
              aria-invalid={Boolean(errors.email)}
              className="h-14 px-4 text-lg md:text-lg"
            />
          </Field>

          <Field id="message" label="お問い合わせ内容" error={errors.message}>
            <Textarea
              id="message"
              name="message"
              required
              rows={6}
              value={fields.message}
              onChange={(e) => update("message", e.target.value)}
              aria-invalid={Boolean(errors.message)}
              className="min-h-40 px-4 py-3 text-lg leading-relaxed md:text-lg"
            />
          </Field>
        </CardContent>

        <CardFooter className="mt-(--card-spacing) flex-col items-stretch gap-3 border-0 bg-transparent pt-0">
          <Button type="submit" size="lg" className="h-14 w-full text-lg font-semibold">
            メールソフトで送信する
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="h-12 w-full text-base text-muted-foreground"
            nativeButton={false} render={<Link href="/" />}
          >
            ← クイズに戻る
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-base text-muted-foreground">
        {label}
        <span className={cn("text-xs", error ? "text-wrong" : "text-muted-foreground")}>必須</span>
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-wrong" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
