


import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: "https://rekyc.meon.co.in/v1/",
});

(async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get("token");
  if (tokenFromUrl) {
    try {
      const res = await axios.post(
        "https://rekyc.meon.co.in/v1/user/token/refresh",
        { refresh: Cookies.get("refresh_token") || tokenFromUrl }
      );
      console.log("res.data", res?.data);
      const { access, refresh } = res.data;

      if (access) {
        // 🔹 remove old tokens before setting new ones
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");

        Cookies.set("access_token", access);
        Cookies.set("refresh_token", refresh);

        console.log("Tokens set from URL:", { access, refresh });
      } else {
        console.warn("Refresh response missing tokens:", res.data);
      }

      urlParams.delete("token");
      const cleanUrl =
        window.location.origin +
        window.location.pathname +
        (urlParams.toString() ? `?${urlParams.toString()}` : "");
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (err) {
      console.error("Failed to exchange tokenFromUrl:", err);
    }
  }
})();

api.interceptors.request.use(
  (config) => {
    const accessToken = Cookies.get("access_token");
    if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = Cookies.get("refresh_token");
      if (!refreshToken) {
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(
          "https://rekyc.meon.co.in/v1/user/token/refresh",
          { refresh: refreshToken }
        );

        const { access, refresh } = res.data;

        if (!access) {
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
          window.location.href = "/notfound";
          return;
        }

        // 🔹 remove old tokens before setting new ones
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");

        Cookies.set("access_token", access);
        Cookies.set("refresh_token", refresh);

        originalRequest.headers["Authorization"] = `Bearer ${access}`;
        return api(originalRequest);
      } catch (err) {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        window.location.href = "/notfound";
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
