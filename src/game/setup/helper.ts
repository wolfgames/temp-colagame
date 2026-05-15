export const getUserData = () => {
  const params = new URLSearchParams(window.location.search);

  const uid =
    params.get("uid") ||
    localStorage.getItem("uid") ||
    `anonymous_${crypto.randomUUID()}`;
  const email = params.get("email") || localStorage.getItem("email") || "";
  const name = params.get("name") || localStorage.getItem("name") || "";

  if (uid) localStorage.setItem("uid", uid);
  if (email) localStorage.setItem("email", email);
  if (name) localStorage.setItem("name", name);

  return { uid, email, name };
};
