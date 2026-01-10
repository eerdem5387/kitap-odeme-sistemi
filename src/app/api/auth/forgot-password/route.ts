import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: 'E-posta adresi gerekli' },
        { status: 400 }
      );
    }

    // Kullanıcıyı kontrol et
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Güvenlik için kullanıcı bulunamasa da aynı mesajı döndür
      return NextResponse.json(
        { message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.' },
        { status: 200 }
      );
    }

    // Reset token oluştur
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 saat

    // TODO: User modeline resetToken ve resetTokenExpiry field'ları eklendiğinde aktif edilecek
    // Şimdilik sadece log'a yazıyoruz
    // await prisma.user.update({
    //   where: { email },
    //   data: {
    //     resetToken,
    //     resetTokenExpiry,
    //   },
    // });

    // E-posta gönderme işlemi burada yapılacak
    // Şimdilik sadece başarılı mesajı döndürüyoruz
    console.log(`Password reset token for ${email}: ${resetToken}`);

    return NextResponse.json(
      { message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'Bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
