export type RegistrationErrors = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  age?: string;
  participation_type?: string;
};

function getText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function isValidName(value: string) {
  return /^[A-Za-zА-Яа-яЁё]{2,}$/.test(value);
}

export function validateRegistrationForm(formData: FormData): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const firstName = getText(formData, "first_name");
  const lastName = getText(formData, "last_name");
  const phone = getText(formData, "phone");
  const age = Number(getText(formData, "age"));
  const participationType = getText(formData, "participation_type");

  if (!isValidName(firstName)) {
    errors.first_name = "Въведи валидно име — само букви, минимум 2 символа.";
  }

  if (!isValidName(lastName)) {
    errors.last_name = "Въведи валидна фамилия — само букви, минимум 2 символа.";
  }

  if (!/^\d{10}$/.test(phone)) {
    errors.phone = "Телефонът трябва да бъде точно 10 цифри.";
  }

  if (!Number.isFinite(age) || age < 16 || age > 60) {
    errors.age = "Участникът трябва да бъде между 16 и 60 години.";
  }

  if (!["rental", "own"].includes(participationType)) {
    errors.participation_type = "Избери начин на участие.";
  }

  return errors;
}

export function hasRegistrationErrors(errors: RegistrationErrors) {
  return Object.values(errors).some(Boolean);
}
