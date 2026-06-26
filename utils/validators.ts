export type RegistrationErrors = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  age?: string;
  participation_type?: string;
};

export function validateRegistrationForm(formData: FormData): RegistrationErrors {
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const ageRaw = String(formData.get("age") || "").trim();
  const participationType = String(formData.get("participation_type") || "").trim();

  const errors: RegistrationErrors = {};

  if (!firstName) {
    errors.first_name = "Въведи име.";
  } else if (!/^[A-Za-zА-Яа-яЁё]{2,40}$/.test(firstName)) {
    errors.first_name = "Името трябва да съдържа само букви.";
  }

  if (!lastName) {
    errors.last_name = "Въведи фамилия.";
  } else if (!/^[A-Za-zА-Яа-яЁё]{2,40}$/.test(lastName)) {
    errors.last_name = "Фамилията трябва да съдържа само букви.";
  }

  if (!isValidBgPhone(phone)) {
    errors.phone = "Регистрацията не беше приета. Въведи валиден български мобилен номер с 10 цифри. Пример: 0897047668.";
  }

  const age = Number(ageRaw);
  if (!ageRaw || Number.isNaN(age)) {
    errors.age = "Въведи възраст.";
  } else if (age < 16) {
    errors.age = "За стандартни игри минималната възраст е 16 години.";
  } else if (age > 80) {
    errors.age = "Провери въведената възраст.";
  }

  if (!participationType) {
    errors.participation_type = "Избери начин на участие.";
  } else if (!['rental', 'own'].includes(participationType)) {
    errors.participation_type = "Избери валиден начин на участие.";
  }

  return errors;
}

export function hasRegistrationErrors(errors: RegistrationErrors) {
  return Object.keys(errors).length > 0;
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function isValidBgPhone(phone: string) {
  return /^08\d{8}$/.test(normalizePhone(phone));
}
