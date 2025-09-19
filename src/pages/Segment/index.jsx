import React, { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import withAuthCheck from "../../hoc/withAuthCheck";
import { decryptData } from "../../decode";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import "./style2.css";
import { SegmentContext } from "../../context/SegmentContext";
import api from "../../api/api";
import VerificationLoader from "../../Components/VerificationLoader/VerificationLoader";

const Segment = ({ encryptedData }) => {
  const { segmentData, setSegmentData } = useContext(SegmentContext);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get("token");
  const navigate = useNavigate();
  const [esignDataStatus, setEsignDataStatus] = useState("");
  const [isEsigned, setIsEsigned] = useState(false);
   const [loading, setLoading] = useState(false);

  console.log("Token from query param:", token);

  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token"); // or Cookies.get("refresh_token")
      if (!refreshToken) throw new Error("No refresh token available");

      const res = await axios.post(
        "https://rekyc.meon.co.in/v1/user/token/refresh_token",
        { refresh: refreshToken },
        { headers: { "Content-Type": "application/json" } }
      );

      const newAccessToken = res.data.access;
      const newRefreshToken = res.data.refresh;

      // Save new tokens
      localStorage.setItem("token", newAccessToken);
      localStorage.setItem("refresh_token", newRefreshToken);

      return newAccessToken;
    } catch (err) {
      console.error("Failed to refresh token:", err);
      throw err;
    }
  };

  useEffect(() => {
    const parsed = JSON.parse(decryptData(encryptedData))[13][
      "segment_details"
    ];
    console.log("setSegmentData", parsed);
    setSegmentData(parsed);
  }, []);

  const segmentsData = encryptedData
    ? JSON.parse(decryptData(encryptedData))[13]["segment_details"]
    : [];

  const getInitialChecked = (exchange, segment) =>
    segmentsData?.find(
      (seg) => seg.exchange === exchange && seg.segment === segment
    )?.ticked || false;

  console.log(segmentsData);

  const [checkedStates, setCheckedStates] = useState({
    NSE_CASH: getInitialChecked("NSE", "CASH"),
    BSE_CASH: getInitialChecked("BSE", "CASH"),
    NSE_FNO: getInitialChecked("NSE", "FNO"),
    BSE_FNO: getInitialChecked("BSE", "FNO"),
  });
  console.log("in the first segment");

  const hasFNOSegment = segmentsData?.some((seg) => seg.segment === "FNO");
  const hasFNOSegmentisNull = segmentsData?.some(
    (seg) => seg.segment === "FNO" && seg.is_new === null
  );
  console.log("hasFNOSegmentisNull", hasFNOSegmentisNull);

  const updatesegmentsData = async (newStates) => {
    const segment_data = Object.entries(newStates)
      .filter(([_, isChecked]) => isChecked)
      .map(([key]) => {
        const [exchange, segment] = key.split("_");
        return { exchange, segment };
      });
    console.log("segment_data", segment_data);

    try {
      console.log("in the second segment");
      await axios.post(
        "https://rekyc.meon.co.in/v1/user/update_user_segments",
        { segment_data },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setsegmentsData(segment_data);
      console.log("Segment updated:", segment_data);
    } catch (error) {
      console.error("Error updating segments:", error);
    }
  };

  // const handleCheckboxChange = (key) => {
  //   const [exchange, segment] = key.split("_");
  //   const newState = !checkedStates[key];
  //   console.log("in the third segment");

  //   const otherExchange = exchange === "NSE" ? "BSE" : "NSE";
  //   const otherKey = `${otherExchange}_${segment}`;

  //   const isOtherDisabled = segmentsData?.some(
  //     (seg) =>
  //       seg.exchange === otherExchange &&
  //       seg.segment === segment &&
  //       seg.ticked === true &&
  //       seg.is_new === false
  //   );

  //   const updatedStates = {
  //     ...checkedStates,
  //     [key]: newState,
  //     ...(isOtherDisabled ? {} : { [otherKey]: newState }),
  //   };

  //   setCheckedStates(updatedStates);

  //   const segment_data = Object.entries(updatedStates)
  //     .filter(([_, value]) => value === true)
  //     .map(([key]) => {
  //       const [exchange, segment] = key.split("_");
  //       return { exchange, segment };
  //     });

  //   //{(!hasFNOSegment || hasFNOSegmentisNull) && (
  //   console.log(
  //     "segmentsData?.some((seg) => seg.segment ===",
  //     segment_data,
  //     segment_data?.some((seg) => seg.segment === "FNO")
  //   );
  //   console.log(
  //     "segment_data",
  //     segment_data,
  //     "hasFNOSegment===>",
  //     !hasFNOSegment,
  //     "hasFNOSegmentisNull",
  //     hasFNOSegmentisNull
  //   );
  //   setSegmentData(segment_data);

  //   axios
  //     .post(
  //       "https://rekyc.meon.co.in/v1/user/update_user_segments",
  //       { segment_data },
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       }
  //     )
  //     .then((res) => {
  //       console.log("Updated segments to API:", segment_data);
  //       setSegmentData(segment_data);
  //     })
  //     .catch((err) => {
  //       console.error("API update error:", err);
  //     });
  // };

  const handleCheckboxChange = async (key) => {
    const [exchange, segment] = key.split("_");
    const newState = !checkedStates[key];

    const otherExchange = exchange === "NSE" ? "BSE" : "NSE";
    const otherKey = `${otherExchange}_${segment}`;

    const isOtherDisabled = segmentsData?.some(
      (seg) =>
        seg.exchange === otherExchange &&
        seg.segment === segment &&
        seg.ticked === true &&
        seg.is_new === false
    );

    const updatedStates = {
      ...checkedStates,
      [key]: newState,
      ...(isOtherDisabled ? {} : { [otherKey]: newState }),
    };

    setCheckedStates(updatedStates);

    const segment_data = Object.entries(updatedStates)
      .filter(([_, value]) => value === true)
      .map(([key]) => {
        const [exchange, segment] = key.split("_");
        return { exchange, segment };
      });

    setSegmentData(segment_data);

    try {
      const token = localStorage.getItem("token");

      await axios.post(
        "https://rekyc.meon.co.in/v1/user/update_user_segments",
        { segment_data },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Updated segments to API:", segment_data);
    } catch (err) {
      if (err.response?.status === 401) {
        console.log("Access token expired → refreshing…");
        try {
          const newToken = await refreshAccessToken();

          // retry request with new token
          await axios.post(
            "https://rekyc.meon.co.in/v1/user/update_user_segments",
            { segment_data },
            { headers: { Authorization: `Bearer ${newToken}` } }
          );

          console.log("Updated segments after refresh:", segment_data);
        } catch (refreshErr) {
          console.error("Refresh flow failed:", refreshErr);
        }
      } else {
        console.error("API update error:", err);
      }
    }
  };

  // const hasBothFNO =
  //   segmentData?.some(
  //     (seg) => seg.exchange === "NSE" && seg.segment === "FNO"
  //   ) &&
  //   segmentData?.some((seg) => seg.exchange === "BSE" && seg.segment === "FNO");

  const handleActivateFNO = async () => {
    console.log("getCheckedSegments", [
      ...(getCheckedSegments()?.segment_data || []),
      {
        exchange: "NSE",
        segment: "FNO",
      },
      {
        exchange: "BSE",
        segment: "FNO",
      },
    ]);
    const makeApiCall = async (accessToken) => {
      return axios.post(
        "https://rekyc.meon.co.in/v1/user/update_user_segments",
        {
          segment_data: [
            ...(getCheckedSegments()?.segment_data || []),
            {
              exchange: "NSE",
              segment: "FNO",
            },
            {
              exchange: "BSE",
              segment: "FNO",
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    };

    try {
      const accessToken = Cookies.get("access_token");
      await makeApiCall(accessToken);

      setSegmentData((prev) => [
        ...(prev || []),
        { exchange: "NSE", segment: "FNO", ticked: true, is_new: true },
      ]);
      navigate("/", { state: { segmentData: segmentData } });
    } catch (error) {
      if (error.response?.status === 401) {
        console.warn("Access token expired. Attempting to refresh...");

        const refreshToken = Cookies.get("refresh_token");
        if (!refreshToken) {
          console.error("No refresh token found.");
          return;
        }

        try {
          const res = await axios.post(
            "https://rekyc.meon.co.in/v1/user/token/refresh_token",
            {
              refresh: refreshToken,
            }
          );

          const newAccessToken = res.data.access;
          const newRefreshToken = res.data.refresh;

          Cookies.set("access_token", newAccessToken, {
            secure: true,
            sameSite: "Strict",
          });
          Cookies.set("refresh_token", newRefreshToken, {
            secure: true,
            sameSite: "Strict",
          });
          localStorage.setItem("token", newAccessToken);

          await makeApiCall(newAccessToken);

          setSegmentData((prev) => [
            ...(prev || []),
            { ...payload[0], ticked: true, is_new: true },
          ]);
          navigate("/");
        } catch (refreshErr) {
          console.error("Failed to refresh token:", refreshErr);
        }
      } else {
        console.error(
          "Error activating F&O segment:",
          error.response?.data || error.message
        );
      }
    }
  };

  useEffect(() => {
    getCheckedSegments();
    fetchEsignStatus();
  }, []);

  useEffect(() => {
    if (esignDataStatus.length > 0) {
      let links = esignDataStatus.filter((link) => !link.is_esigned);
      if (!links || links.length === 0) {
        setIsEsigned(false);
      } else {
        setIsEsigned(true);
      }
    }
  }, [esignDataStatus]);

  const fetchEsignStatus = async () => {
    try {
      const moduleRes = await api.post("/user/get_module_data", {
        page_id: "6",
      });
      console.log("get_module_data (raw) ->", moduleRes.data);

      let parsed;
      try {
        parsed = JSON.parse(decryptData(moduleRes.data.data));
      } catch (err) {
        console.error("Failed to parse decrypted data:", err);
        parsed = {};
      }
      let links = parsed?.["12"]?.links || [];
      console.log("links", links);
      setEsignDataStatus(links);
    } catch (err) {
      console.error("Error fetching eSign data:", err);
    } finally {
    }
  };

  const getCheckedSegments = () => {
    const checked = [];

    for (const key in checkedStates) {
      if (checkedStates[key]) {
        const [exchange, segment] = key.split("_");
        checked.push({ exchange, segment });
      }
    }

    const formatted = { segment_data: checked };

    const hasNSE_FNO = checked.some(
      (seg) => seg.exchange === "NSE" && seg.segment === "FNO"
    );
    const hasBSE_FNO = checked.some(
      (seg) => seg.exchange === "BSE" && seg.segment === "FNO"
    );
    const hasBothFNO = hasNSE_FNO && hasBSE_FNO;

    console.log("✅ Checked Segment Data:", formatted);
    console.log(
      "👉 hasNSE_FNO:",
      hasNSE_FNO,
      "hasBSE_FNO:",
      hasBSE_FNO,
      "hasBothFNO:",
      hasBothFNO
    );

    return { ...formatted, hasBothFNO };
  };

  console.log("getCheckedSegments", getCheckedSegments());
  const { hasBothFNO } = getCheckedSegments();
  console.log("hasBothFNO, hasBothFNO", hasBothFNO, hasBothFNO);
  return (
    
    <div>
       {loading && <VerificationLoader isVisible={loading} />}
      <header>
        <div className="header_div">
          <p className="trading_pre">Trading preference</p>
          <button className="back_btn_head">
            <img className="back_btn1" src="./Icon_apparrow.svg" alt="" />
          </button>
        </div>
      </header>

      <div className="mainnnn">
        <div className="segment_act">
          <p className="seg_act">Segment activation</p>
          <p className="here_your">
            Here is your segment information, showing whether each one is active
            or not
          </p>
        </div>
        <div className="card_1">
          <div className="card-title">
            <i className="same_design_seg">
              <img
                src="./currency_rupee_circle_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
              />
            </i>{" "}
            Equity <span className="badge">Active</span>
          </div>

          <div className="main_check">
            <label className="custom-checkbox">
              <input
                type="checkbox"
                name="nse"
                exchange="NSE"
                segment="CASH"
                checked={checkedStates.NSE_CASH}
                onChange={() => handleCheckboxChange("NSE_CASH")}
                disabled={segmentsData?.find(
                  (seg) =>
                    seg.exchange === "NSE" &&
                    seg.segment === "CASH" &&
                    seg.ticked === true &&
                    seg.is_new === false
                )}
              />
              <span className="checkmark"></span> NSE
            </label>

            <label className="custom-checkbox">
              <input
                type="checkbox"
                name="bse"
                exchange="BSE"
                segment="CASH"
                checked={checkedStates.BSE_CASH}
                onChange={() => handleCheckboxChange("BSE_CASH")}
                disabled={segmentsData?.find(
                  (seg) =>
                    seg.exchange === "BSE" &&
                    seg.segment === "CASH" &&
                    seg.ticked === true &&
                    seg.is_new === false
                )}
              />
              <span className="checkmark"></span> BSE
            </label>
          </div>
        </div>

        {/* Show Activate Banner if NOT both FNO present */}
        {(!hasBothFNO || !isEsigned) && (
          <div className="card_1 card_2">
            <div className="card-title">
              <i className="same_design_seg">
                <img
                  src="./candlestick_chart_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg"
                  alt=""
                />
              </i>{" "}
              Futures & Options
            </div>
            <div className="banner">
              <button
                className="banner_img_btn"
                onClick={() => {
                  console.log("Banner image clicked");
                  handleActivateFNO();
                }}
              >
                <img
                  className="banner-image"
                  src="https://storage.googleapis.com/app-assets-univest/kyc_meon/futures_and_options.png"
                  alt="Chart Icon"
                />
              </button>
            </div>
          </div>
        )}
        {/* Show Active F&O if both NSE + BSE FNO present */}

        {hasBothFNO && isEsigned && (
          <div className="card_1 card_3">
            <div className="card-title">
              <i className="same_design_seg">
                <img
                  src="./candlestick_chart_24dp_E8EAED_FILL0_wght400_GRAD0_opsz24.svg"
                  alt=""
                />
              </i>{" "}
              Futures & Options <span className="badge">Active</span>
            </div>

            <div className="main_check">
              <label className="custom-checkbox">
                <input
                  type="checkbox"
                  name="nse"
                  exchange="NSE"
                  segment="FNO"
                  checked={checkedStates.NSE_FNO}
                  onChange={() => handleCheckboxChange("NSE_FNO")}
                  disabled={segmentsData?.find(
                    (seg) =>
                      seg.exchange === "NSE" &&
                      seg.segment === "FNO" &&
                      seg.ticked === true &&
                      seg.is_new === false
                  )}
                />
                <span className="checkmark"></span> NSE
              </label>

              <label className="custom-checkbox">
                <input
                  type="checkbox"
                  name="bse"
                  exchange="BSE"
                  segment="FNO"
                  checked={checkedStates.BSE_FNO}
                  onChange={() => handleCheckboxChange("BSE_FNO")}
                  disabled={segmentsData?.find(
                    (seg) =>
                      seg.exchange === "BSE" &&
                      seg.segment === "FNO" &&
                      seg.ticked === true &&
                      seg.is_new === false
                  )}
                />
                <span className="checkmark"></span> BSE
              </label>
            </div>
          </div>
        )}
      </div>

      <footer className="s_footer">
        <p className="Note_modify">
          Note: To modify or delete any details, please write to us at
          support@unibrokers.in and our support team will help you out.
        </p>
      </footer>
    </div>
  );
};

export default withAuthCheck(Segment);
