import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { addUser, findUserByEmail } from '@/lib/data';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();
    
    console.log('Запрос на регистрацию:', { email, name });

    // Проверка входных данных
    if (!email || !password || !name) {
      console.log('Ошибка: не все поля заполнены');
      return NextResponse.json(
        { error: 'Все поля обязательны' },
        { status: 400 }
      );
    }

    // Проверка существования пользователя
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      console.log('Ошибка: пользователь уже существует:', { email });
      return NextResponse.json(
        { error: 'Пользователь уже существует' },
        { status: 400 }
      );
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание пользователя
    const newUser = {
      id: Date.now().toString(),
      email,
      name,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    addUser(newUser);

    // Возвращаем пользователя без пароля
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(
      { 
        message: 'Пользователь успешно зарегистрирован',
        user: userWithoutPassword 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 