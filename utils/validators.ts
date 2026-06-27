export type RegistrationErrors = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  age?: string;
  participation_type?: string;
};

function text(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function isName(value: string) {
  return /^[A-Za-zА-Яа-яЁё]{2,40}$/.test(value);
}

export function validateRegistrationForm(formData: FormData) {
  const errors: RegistrationErrors = {};
  const firstName = text(formData.get("first_name"));
  const lastName = text(formData.get("last_name"));
  const phone = text(formData.get("phone")).replace(/\D/g, "");
  const age = Number(text(formData.get("age")));
  const participationType = text(formData.get("participation_type"));

  if (!isName(firstName)) {
    errors.first_name = "Въведи валидно име - само букви, минимум 2 символа.";
  }

  if (!isName(lastName)) {
    errors.last_name = "Въведи валидна фамилия - само букви, минимум 2 символа.";
  }

  if (!/^08\d{8}$/.test(phone)) {
    errors.phone = "Телефонът трябва да е валиден български номер с 10 цифри. Пример: 0897047668.";
  }

  if (!Number.isFinite(age) || age < 16 || age > 60) {
    errors.age = "Възрастта трябва да е между 16 и 60 години.";
  }

  if (participationType !== "rental" && participationType !== "own") {
    errors.participation_type = "Избери дали си с наета или собствена екипировка.";
  }

  return errors;
}

export function hasRegistrationErrors(errors: RegistrationErrors) {
  return Object.values(errors).some(Boolean);
}
