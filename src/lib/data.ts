import fs from 'fs';
import path from 'path';

// Путь к файлу с данными пользователей
const USERS_FILE_PATH = path.join(process.cwd(), 'users.json');

export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: string;
}

// Загрузка пользователей из файла
const loadUsers = (): User[] => {
  try {
    if (fs.existsSync(USERS_FILE_PATH)) {
      const data = fs.readFileSync(USERS_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Ошибка загрузки пользователей:', error);
  }
  return [];
};

// Сохранение пользователей в файл
const saveUsers = (users: User[]) => {
  try {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Ошибка сохранения пользователей:', error);
  }
};

// Инициализация пользователей
let users: User[] = loadUsers();

export const addUser = (user: User) => {
  console.log('Добавление пользователя:', { email: user.email, name: user.name });
  users.push(user);
  saveUsers(users);
  console.log('Текущие пользователи:', users.map(u => ({ email: u.email, name: u.name })));
};

export const findUserByEmail = (email: string) => {
  console.log('Поиск пользователя по email:', email);
  console.log('Доступные пользователи:', users.map(u => ({ email: u.email, name: u.name })));
  const user = users.find(user => user.email === email);
  console.log('Найденный пользователь:', user ? { email: user.email, name: user.name } : 'не найден');
  return user;
};

export const findUserById = (id: string) => {
  return users.find(user => user.id === id);
};

export const getAllUsers = () => {
  return users.map(user => ({ email: user.email, name: user.name, id: user.id }));
};

// Функция для перезагрузки данных (для отладки)
export const reloadUsers = () => {
  users = loadUsers();
  console.log('Пользователи перезагружены:', users.map(u => ({ email: u.email, name: u.name })));
}; 