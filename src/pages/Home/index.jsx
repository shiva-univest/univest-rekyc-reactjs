// import React, { useContext, useEffect } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
// import { SegmentContext } from "../../context/SegmentContext";
// import "./style.css";

// const Home = () => {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const segmentData = location.state?.segmentData;

//   const handleProceed = () => {
//     const data = {
//       page_id: "5",
//       name: "F&O Segment Activation",
//     };
//     navigate("/activatebank");
//   };

//   return (
//     <div>
//       <header className="head_main_cls">
//         <div className="a_header_main">
//           <button className="a_btn_header">
//             <img src="./Icon_app.svg" alt="" />
//           </button>
//           <button className="a_btn_header">
//             <img src="./Frame 1171276551.svg" alt="" />
//           </button>
//         </div>
//       </header>

//       <div className="bodyy">
//         <p className="a_active_fut">Activate Future & Options</p>

//         <div className="a_img_active">
//           <img
//             src="./Screenshot_2024-05-17-10-03-33-16_8733eabc5489046586ad8c6f3efd7459.svg"
//             alt=""
//           />
//         </div>

//         <div className="trade-container">
//           <h2 className="title">Trade responsibly in F&amp;O</h2>
//           <p className="subtitle">Risk disclosures on Derivatives</p>
//           <ul className="info-list">
//             <li>
//               9 out of 10 individual traders in equity Futures and Options
//               Segment, incurred net losses
//             </li>
//             <li>
//               On an average, loss makers registered net trading loss close to
//               ₹50,000
//             </li>
//             <li>
//               Over and above the net trading losses incurred, loss makers
//               expended an additional 28% of net trading losses as transaction
//               costs
//             </li>
//             <li>
//               Those making net trading profits, incurred between 15% to 50% of
//               such profits as transaction cost
//             </li>
//           </ul>

//           <button className="otp-button_3">
//             Activate in just a single click through OTP
//           </button>

//           <p className="disclaimer">
//             <strong className="a_disclaimer">Disclaimer:</strong> This is for
//             general information and educational purposes only. The securities
//             quoted are for illustration only and are not recommendation. It can
//             not be construed as an investment advice and PMS/basket
//             recommendation. Investments in the securities market are subject to
//             market risks. Read all the related documents carefully before
//             investing. For further disclosures, visit{" "}
//             <a href="#">https://univest.in</a> or Univest App.
//           </p>

//           <div className="action-buttons">
//             <div className="bottom_button_g0_pro">
//               <button className="go-back" onClick={() => navigate("/segment")}>
//                 Go back
//               </button>

//               <button className="proceed" onClick={handleProceed}>
//                 Proceed
//               </button>
//             </div>

//             <p className="footer-note">
//               <img src="./Frame 150007.svg" alt="" />
//               Portfolios worth <strong>3,500Cr+</strong> connected
//             </p>
//           </div>
//         </div>
//       </div>

//       <footer></footer>
//     </div>
//   );
// };

// export default Home;

import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Cookies from "js-cookie";
import axios from "axios";
import "./style.css";

const REFRESH_URL = "https://rekyc.meon.co.in/v1/user/token/refresh";
const UPDATE_SEGMENTS_URL =
  "https://rekyc.meon.co.in/v1/user/update_user_segments";

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const segmentData = location.state?.segmentData;

  // helper: refresh token
  const refreshAccessToken = async () => {
    const refreshToken = Cookies.get("refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const resp = await axios.post(
        REFRESH_URL,
        { refresh_token: refreshToken },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const newAccessToken = resp.data.access_token;
      const newRefreshToken = resp.data.refresh_token;

      if (newAccessToken) {
        Cookies.set("access_token", newAccessToken);
      }
      if (newRefreshToken) {
        Cookies.set("refresh_token", newRefreshToken);
      }

      return newAccessToken;
    } catch (err) {
      console.error("Error refreshing token:", err);
      throw err;
    }
  };

  const getValidToken = async () => {
    let accessToken = Cookies.get("access_token");
    if (!accessToken) {
      accessToken = await refreshAccessToken();
    }
    return accessToken;
  };

  const handleGoBack = async () => {
    try {
      let token = await getValidToken();

      const filteredData = (segmentData || []).filter(
        (seg) => seg.segment !== "FNO"
      );

      const payload = { segment_data: filteredData };

      try {
        await axios.post(UPDATE_SEGMENTS_URL, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (err) {
        // if error is 401 (unauthorized), means token likely expired
        if (err.response && err.response.status === 401) {
          // refresh and retry
          console.log("Access token expired, refreshing...");
          token = await refreshAccessToken();

          // retry with new token
          await axios.post(UPDATE_SEGMENTS_URL, payload, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
        } else {
          // some other error
          console.error("Error updating segments (not auth):", err);
        }
      }

      // after all this, navigate
      navigate("/segment");
    } catch (err) {
      console.error("Error in handleGoBack flow:", err);
      // fallback navigate
      navigate("/segment");
    }
  };

  const handleProceed = () => {
    // navigate("/activatebank");
    navigate("/activatebank", { state: { segmentData } });
  };

  return (
    <div>
      <header className="head_main_cls">
        <div className="a_header_main">
          <button className="a_btn_header">
            <img src="./Icon_app.svg" alt="" />
          </button>
          <button className="a_btn_header">
            <img src="./Frame 1171276551.svg" alt="" />
          </button>
        </div>
      </header>

      <div className="bodyy">
        <p className="a_active_fut">Activate Future & Options</p>

        <div className="a_img_active">
          <img
            src="./Screenshot_2024-05-17-10-03-33-16_8733eabc5489046586ad8c6f3efd7459.svg"
            alt=""
          />
        </div>

        <div className="trade-container">
          <h2 className="title">Trade responsibly in F&amp;O</h2>
          <p className="subtitle">Risk disclosures on Derivatives</p>
          <ul className="info-list">
            <li>
              9 out of 10 individual traders in equity Futures and Options
              Segment, incurred net losses
            </li>
            <li>
              On an average, loss makers registered net trading loss close to
              ₹50,000
            </li>
            <li>
              Over and above the net trading losses incurred, loss makers
              expended an additional 28% of net trading losses as transaction
              costs
            </li>
            <li>
              Those making net trading profits, incurred between 15% to 50% of
              such profits as transaction cost
            </li>
          </ul>

          <button className="otp-button_3">
            Activate in just a single click through OTP
          </button>

          <p className="disclaimer">
            <strong className="a_disclaimer">Disclaimer:</strong> This is for
            general information and educational purposes only. The securities
            quoted are for illustration only and are not recommendation. It can
            not be construed as an investment advice and PMS/basket
            recommendation. Investments in the securities market are subject to
            market risks. Read all the related documents carefully before
            investing. For further disclosures, visit{" "}
            <a href="#">https://univest.in</a> or Univest App.
          </p>

          <div className="action-buttons">
            <div className="bottom_button_g0_pro">
              <button className="go-back" onClick={handleGoBack}>
                Go back
              </button>

              <button className="proceed" onClick={handleProceed}>
                Proceed
              </button>
            </div>
            <div className="bottom_home">
              <span>
                <img src="./Frame 150007.svg" />
              </span>
              Portfolios worth<strong>3,500Cr+</strong> connected
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
