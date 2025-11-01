import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  const { SMTP_PASSWORD, SMTP_EMAIL } = process.env;

  // Проверка наличия SMTP-данных из .env
  if (!SMTP_PASSWORD || !SMTP_EMAIL) {
    return NextResponse.json(
      { error: "Missing SMTP credentials" },
      { status: 500 }
    );
  }

  // Парсим тело запроса
  const { name, email, message } = await req.json();

  // Проверка обязательных полей
  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Создаём транспортер для Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SMTP_EMAIL, // berhaneselassie1945@gmail.com
      pass: SMTP_PASSWORD, // qzcn aqxu jrfy onpi
    },
  });

  try {
    // Отправляем письмо
    await transporter.sendMail({
      from: SMTP_EMAIL,
      to: SMTP_EMAIL, // Отправляем на тот же email, можно изменить
      subject: `Нове повідомлення від ${name}`,
      html: `
        <h3>Нове повідомлення з сайту</h3>
        <p><strong>Ім’я:</strong> ${name}</p>
        <p><strong>Телефон:</strong> ${email}</p>
        <p><strong>Повідомлення:</strong> ${message}</p>
      `,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error sending email" }, { status: 500 });
  }
}
