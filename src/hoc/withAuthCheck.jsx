import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const getToken = () => {
  return localStorage.getItem("token") || Cookies.get("token");
};

const getPageIdFromPath = (pathname) => {
  if (pathname === "/activatebank") return "5";
  if (pathname === "/segment") return "3";
  if (pathname === "/bank") return "2";
  if (pathname === "/personalinfo") return "1";
  if (pathname === "/activateddpi") return "9";
  return "10";
};

const withAuthCheck = (WrappedComponent) => {
  return (props) => {
    const location = useLocation();
    const navigate = useNavigate();
    console.log("this is the withauth");

    const [validToken, setValidToken] = useState(null);
    const [tokenChecked, setTokenChecked] = useState(false);
    const [encryptedData, setEncryptedData] = useState(null);

    useEffect(() => {
      const checkToken = async () => {
        const urlParams = new URLSearchParams(location.search);
        const tokenFromURL = urlParams.get("token");
        console.log("tokenFromURL", tokenFromURL);
        if (tokenFromURL) {
          localStorage.setItem("token", tokenFromURL);
          await fetchTokenAndModuleData(tokenFromURL);
          urlParams.delete("token");

          navigate(
            {
              pathname: location.pathname,
              search: urlParams.toString(),
            },
            { replace: true }
          );
          return;
        }

        const savedToken = getToken();
        if (savedToken) {
          setValidToken(savedToken);
          await fetchTokenAndModuleData(savedToken);
        }

        setTokenChecked(true);
      };

      checkToken();
    }, [location.search]);

    const fetchTokenAndModuleData = async (token) => {
      const refreshToken = token || Cookies.get("refresh_token");
      console.log("refreshTokennnnnnn", token, Cookies.get("refresh_token"));
      if (!refreshToken) {
        console.warn("No refresh token found.");
        return;
      }

      try {
        const tokenRes = await axios.post(
          "https://rekyc.meon.co.in/v1/user/token/refresh",
          { refresh: refreshToken }
        );
        const { access, refresh } = tokenRes.data;
        console.log("tokenRes", tokenRes, access, refresh);

        Cookies.remove("access_token");
        Cookies.remove("refresh_token");

        Cookies.set("access_token", access);
        Cookies.set("refresh_token", refresh);

        console.log("Tokens set in cookies:", {
          accessToken: Cookies.get("access_token"),
          refreshToken: Cookies.get("refresh_token"),
        });

        const pageId = getPageIdFromPath(location.pathname);

        const moduleRes = await axios.post(
          "https://rekyc.meon.co.in/v1/user/get_module_data",
          { page_id: pageId },
          {
            headers: {
              Authorization: `Bearer ${Cookies.get("access_token")}`,
            },
          }
        );

        const data = moduleRes.data?.data;
        if (data) {
          setEncryptedData(data);
        } else {
          console.warn("No data found in module response.");
        }
      } catch (err) {
        console.error(
          "Error fetching data:",
          err.response?.data || err.message
        );
      }
    };

    if (!tokenChecked) return null;

    if (!validToken && !Cookies.get("access_token")) {
      return <Navigate to="/notfound" />;
    }

    return <WrappedComponent {...props} encryptedData={encryptedData} />;
  };
};

export default withAuthCheck;
