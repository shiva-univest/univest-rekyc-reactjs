import React, { useState, useEffect, useRef } from "react";
import "./style.css";
import Cookies from "js-cookie";
import { decryptData } from "../../decode";
import { useLocation, useNavigate } from "react-router-dom";
import withAuthCheck from "../../hoc/withAuthCheck";
import { BANKLIST } from "../../lib/utils";
import api from "../../api/api";
import { triggerWebhook } from "../../helper/usewebhook";
import VerificationLoader from "../../Components/VerificationLoader/VerificationLoader";
import { sendDataToMixpanel } from "../../lib/utils";
import { alright } from "../../lib/utils";

const Bank = ({ encryptedData }) => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [formGenerationLoading, setFormGenerationLoading] = useState(false);
  const navigate = useNavigate();
  const accountDetailsPopupRef = useRef(null);
  const deletePopupRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const [makePrimaryLoading, setMakePrimaryLoading] = useState(false);

  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const [showAccountDetailsPopup, setShowAccountDetailsPopup] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showAddAccountPopup, setShowAddAccountPopup] = useState(false);
  const [deleteDetailsPopup, setdeleteDetailsPopup] = useState(false);
  const [esignDataStatus, setEsignDataStatus] = useState("");
  const [isEsigned, setIsEsigned] = useState(false);
  const [moduleSharedData, setModuleSharedData] = useState(null);

  const parseEncryptedData = () => {
    try {
      sendDataToMixpanel("page_viewed", {
        page: "rekyc_managebank_home",
      });
      if (!encryptedData) return;
      const decrypted = decryptData(encryptedData);
      const parsedData = JSON.parse(decrypted);
      console.log("thisssssssssssss", decrypted);
      console.log("thisssssssssssssssssssssssssss2", parsedData);

      if (parsedData?.["7"]?.bank_detail_data) {
        const formattedAccounts = parsedData["7"].bank_detail_data.map(
          (account) => ({
            id: account.id,
            bankName: account.bank_name,
            accountNumber: account.account_number,
            isPrimary: account.is_default,
            branchname: account.branch_name,
            ifscCode: account.ifsc,
            accountType: account.account_type,
            is_new: account.is_new,
          })
        );
        setBankAccounts(formattedAccounts);
      }
    } catch (err) {
      console.error("Failed to parse encrypted data", err);
      setError("Failed to load account data");
    }
  };

  useEffect(() => {
    const fetchModuleData = async () => {
      try {
        const moduleDataResponse = await fetch(
          "https://rekyc.meon.co.in/v1/user/get_module_data",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Cookies.get("access_token")}`,
            },
            body: JSON.stringify({ page_id: "2" }),
          }
        );

        if (!moduleDataResponse.ok) {
          throw new Error("Failed to fetch module data");
        }

        const moduleData = await moduleDataResponse.json();
        console.log("Module Data Response:", moduleData);

        if (!moduleData?.data) {
          return { success: false, error: "No module data received" };
        }

        const { decryptData } = await import("../../decode");
        const decryptedData = JSON.parse(decryptData(moduleData.data));
        setModuleSharedData(decryptedData?.shared_data || null);
      } catch (moduleErr) {
        console.error("Failed to fetch or process module data:", moduleErr);
        return {
          success: false,
          error: "Failed to verify mobile number details",
        };
      }
    };

    fetchModuleData();
  }, [Cookies.get("access_token")]);

  const fetchBankAccounts = async () => {
    try {
      setIsLoading(true);
      const accessToken = Cookies.get("access_token");

      const response = await fetch(
        "https://rekyc.meon.co.in/v1/user/get_module_data",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ page_id: "2" }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch bank accounts");
      }

      const data = await response.json();
      const decrypted = decryptData(data.data);
      const parsedData = JSON.parse(decrypted);
      console.log("parsedDataaaaaaaaaaaaa", parsedData);
      if (parsedData?.["7"]?.bank_detail_data) {
        const formattedAccounts = parsedData["7"].bank_detail_data.map(
          (account) => ({
            id: account.id,
            bankName: account.bank_name,
            accountNumber: account.account_number,
            isPrimary: account.is_default,
            branchname: account.branch_name,
            ifscCode: account.ifsc,
            accountType: account.account_type,
            is_new: account.is_new,
          })
        );
        setBankAccounts(formattedAccounts);
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    try {
      setIsLoading(true);
      const accessToken = Cookies.get("access_token");

      const response = await fetch(
        `https://rekyc.meon.co.in/v1/user/delete_bank_details/${accountId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      await fetchBankAccounts();
      setdeleteDetailsPopup(false);
    } catch (error) {
      console.error("Delete error:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMakePrimary = async (accountId) => {
    try {
      setIsLoading(true);
      const accessToken = Cookies.get("access_token");

      const response = await fetch(
        `https://rekyc.meon.co.in/v1/user/make_default_bank/${accountId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to set account as primary");
      }

      await fetchBankAccounts();
      setShowAccountDetailsPopup(false);
      setShowDropdown(false);
    } catch (error) {
      console.error("Make primary error:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowAccountDetails = (account) => {
    setSelectedAccount(account);
    setShowAccountDetailsPopup(true);
    setShowDropdown(false);
  };

  const fetchAndRedirectToEsignLink = async (token) => {
    try {
      setLoading(true);
      const moduleRes = await fetch(
        "https://rekyc.meon.co.in/v1/user/get_module_data",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ page_id: "6" }),
        }
      );

      const moduleData = await moduleRes.json();
      console.log("get_module_data (raw) ->", moduleData);

      let parsed;
      try {
        // You'll need to import the decryptData function
        parsed = JSON.parse(decryptData(moduleData.data));
      } catch (err) {
        console.error("Failed to parse decrypted data:", err);
        parsed = {};
      }

      // Get links
      let links = parsed?.["12"]?.links || [];

      // Filter out signed ones
      links = links.filter((link) => !link.is_esigned);

      console.log("Filtered Links ->", links);

      if (!links || links.length === 0) {
        // No links available, redirect to congratulations
        navigate("/congratulations");
      } else {
        // Open the first available eSign link
        const firstLink = links[0];
        window.location.href = `https://rekyc.meon.co.in${firstLink.url}`;

        // Optionally, you can also navigate to congratulations or stay on current page
        // navigate("/congratulations");
      }
    } catch (err) {
      console.error("Error fetching eSign data:", err);
      alert("Failed to get eSign link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to call user form generation API
  const callUserFormGeneration = async () => {
    try {
      setLoading(true);
      const token = Cookies.get("access_token");

      if (!token) {
        alert("Authorization failed.");
        return;
      }
      triggerWebhook({
        step: "bank",
        eSignCompleted: "no",
        finalUpdateExecuted: "no",
        userId: moduleSharedData?.clientcode || "<user-id>",
      });
      const response = await fetch(
        "https://rekyc.meon.co.in/v1/user/user_form_generation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ re_esign: false }),
        }
      );

      const formData = await response.json();
      console.log("User form generation response:", formData);

      if (formData?.status === true) {
        console.log("Form generation successful, navigating to esign");
        // Fetch module data to get eSign links
        await fetchAndRedirectToEsignLink(token);
      } else {
        alert(
          formData?.message || "Failed to generate user form. Please try again."
        );
      }
    } catch (error) {
      console.error("User form generation error:", error);
      alert("Failed to generate user form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // const callUserFormGeneration = async () => {
  //   try {
  //     setFormGenerationLoading(true);
  //     const token = Cookies.get("access_token");

  //     if (!token) {
  //       alert("Authorization failed.");
  //       return;
  //     }

  //     const response = await fetch(
  //       "https://rekyc.meon.co.in/v1/user/user_form_generation",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${token}`,
  //         },
  //         body: JSON.stringify({ re_esign: false }),
  //       }
  //     );

  //     const formData = await response.json();
  //     console.log("User form generation response:", formData);

  //     if (formData?.status === true) {
  //       console.log("Form generation successful, navigating to esign");
  //       navigate("/esign");
  //     } else {
  //       alert(
  //         formData?.message || "Failed to generate user form. Please try again."
  //       );
  //     }
  //   } catch (error) {
  //     console.error("User form generation error:", error);
  //     alert("Failed to generate user form. Please try again.");
  //   } finally {
  //     setFormGenerationLoading(false);
  //   }
  // };

  const toggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX - 100,
    });
    setShowDropdown(!showDropdown);
  };

  const toggleAddAccountPopup = () => {
    setShowAddAccountPopup(!showAddAccountPopup);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showAccountDetailsPopup &&
        accountDetailsPopupRef.current &&
        !accountDetailsPopupRef.current.contains(event.target)
      ) {
        setShowAccountDetailsPopup(false);
      }

      if (
        deletePopupRef.current &&
        !deletePopupRef.current.contains(event.target) &&
        deleteDetailsPopup
      ) {
        setdeleteDetailsPopup(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAccountDetailsPopup, deleteDetailsPopup]);

  useEffect(() => {
    fetchEsignStatus();
    if (encryptedData) {
      parseEncryptedData();
    } else {
      fetchBankAccounts();
    }
  }, [encryptedData]);

  useEffect(() => {
    if (esignDataStatus.length > 0) {
      let links = esignDataStatus.filter((link) => !link.is_esigned);
      if (!links || links.length === 0 || links) {
        setIsEsigned(false);
      } else {
        setIsEsigned(true);
      }
    }
  }, [esignDataStatus]);

  useEffect(() => {
    if (!isEsigned && Array.isArray(bankAccounts)) {
      console.log("bankAccounts", bankAccounts);

      const processAccounts = async () => {
        for (const account of bankAccounts) {
          if (account.is_new && !account.isPrimary) {
            await handleDeleteAccount(account.id);
          } else if (account.is_new && account.isPrimary) {
            const oldAccount = bankAccounts.find((acc) => !acc.is_new);

            if (oldAccount) {
              try {
                await handleMakePrimary(oldAccount.id);
                await handleDeleteAccount(account.id);
              } catch (error) {
                console.error(`Error processing account ${account.id}`, error);
              }
            } else {
              console.warn(
                "No old account found to make primary before deleting new one"
              );
            }
          }
        }
      };

      processAccounts();
    }
  }, [isEsigned, bankAccounts]);

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

  return (
    <div className="bank-container">
      {loading && <VerificationLoader isVisible={loading} />}
      <header className="head_cl">
        <div className="bank-header">
          <div className="bank-back-container">
            <button className="bank-back" onClick={alright}>
              <svg
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16 24L17.05 22.925L10.875 16.75H24V15.25H10.875L17.05 9.075L16 8L8 16L16 24Z"
                  fill="#202020"
                />
              </svg>
            </button>
          </div>
          <p>Manage bank account</p>
        </div>
      </header>

      <div className="bank-body">
        {isLoading ? (
          <div className="loading-spinner">Loading accounts...</div>
        ) : error ? (
          <div className="error-message">
            Error: {error}
            <button onClick={fetchBankAccounts}>Retry</button>
          </div>
        ) : (
          bankAccounts.map((account) => (
            <div
              key={account.id}
              className="account-button-wrapper bank-details"
            >
              <button
                className={`bank-button ${
                  account.isPrimary ? "primary" : "secondary"
                }`}
                onClick={() => {
                  sendDataToMixpanel("cta_clicked", {
                    page: "rekyc_managebank_home",
                    cta_text: account.bankName,
                    tile: account.accountNumber,
                    is_primary: account.isPrimary ? "true" : "false",
                  });
                  handleShowAccountDetails(account);
                }}
              >
                <div className="bank-icon">
                  <img
                    alt={account.bankName}
                    className="bank_icon_cls"
                    src={
                      BANKLIST?.filter((f) =>
                        account.bankName
                          ?.toLowerCase()
                          ?.includes(f.name?.toLowerCase())
                      )?.[0]?.url ?? "./bank5.png"
                    }
                  ></img>
                </div>
                <div className="account-details">
                  <h4>{account.bankName}</h4>
                  <p className="federal-acc-no">
                    XXXXXXXX{account.accountNumber.slice(-4)}
                  </p>
                  {account.isPrimary && (
                    <span className="b1-primary">Primary</span>
                  )}
                </div>

                <svg
                  id="svg"
                  width="4"
                  height="16"
                  viewBox="0 0 4 16"
                  onClick={(e) => {
                    e.stopPropagation();

                    sendDataToMixpanel("cta_clicked", {
                      page: "rekyc_managebank_home",
                      cta_text: "3dot",
                      tile: account.accountNumber,
                      is_primary: account.isPrimary ? "true" : "false",
                    });

                    const rect = e.currentTarget.getBoundingClientRect();
                    setDropdownPosition({
                      top: rect.bottom + window.scrollY,
                      left: rect.left + window.scrollX - 100,
                    });
                    setShowDropdown(!showDropdown);
                    setSelectedAccount(account);
                  }}
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14C0 13.45 0.195833 12.9792 0.5875 12.5875C0.979167 12.1958 1.45 12 2 12C2.55 12 3.02083 12.1958 3.4125 12.5875C3.80417 12.9792 4 13.45 4 14C4 14.55 3.80417 15.0208 3.4125 15.4125C3.02083 15.8042 2.55 16 2 16ZM2 10C1.45 10 0.979167 9.80417 0.5875 9.4125C0.195833 9.02083 0 8.55 0 8C0 7.45 0.195833 6.97917 0.5875 6.5875C0.979167 6.19583 1.45 6 2 6C2.55 6 3.02083 6.19583 3.4125 6.5875C3.80417 6.97917 4 7.45 4 8C4 8.55 3.80417 9.02083 3.4125 9.4125C3.02083 9.80417 2.55 10 2 10ZM2 4C1.45 4 0.979167 3.80417 0.5875 3.4125C0.195833 3.02083 0 2.55 0 2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0C2.55 0 3.02083 0.195833 3.4125 0.5875C3.80417 0.979167 4 1.45 4 2C4 2.55 3.80417 3.02083 3.4125 3.4125C3.02083 3.80417 2.55 4 2 4Z"
                    fill="#000000"
                  />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      <footer>
        <div className="bank-footer">
          <p>Note: You can add up to 3 bank accounts</p>
          <button
            className="univest-actions-btn"
            onClick={() => navigate("/bankaccount")}
            
          >
            Add bank account
          </button>
        </div>
      </footer>

      {showDropdown && selectedAccount && (
        <div
          className="bank-dropdown"
          style={{
            position: "absolute",
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span
            onClick={() => {

               sendDataToMixpanel("cta_clicked", {
      page: "rekyc_managebank_home",
      cta_text: "info",
    });

              setShowAccountDetailsPopup(true);
              setShowDropdown(false);
            }}
          >
            <img className="info_icon_img" src="./info_ic.svg" alt="" />
            Info
          </span>
          {/* only show the make primary button if account is not prim */}
          {!selectedAccount.isPrimary && (
            <>
              <span
                className="primary"
                onClick={async () => {

                  sendDataToMixpanel("cta_clicked", {
                        page: "rekyc_managebank_home",
                        chip_text: "make_primary",
                      });
                  handleMakePrimary(selectedAccount.id);
                  setShowDropdown(false);

                  await callUserFormGeneration();
                }}
              >
                <img className="info_icon_img" src="./make_prima.svg" alt="" />
                Make primary
              </span>
              <span
                className="red"
                onClick={() => {
                  setdeleteDetailsPopup(true);
                  setShowDropdown(false);
                }}
              >
                <img className="info_icon_img" src="./delet.svg" alt="" />
                Delete
              </span>
            </>
          )}
        </div>
      )}

      {showAccountDetailsPopup && selectedAccount && (
        <div className="account-details-popup-overlay">
          <div className="account-details-popup" ref={accountDetailsPopupRef}>
            <div className="popup-content_bank">
              <h3>Bank account details</h3>
              <div className="account-details-grid">
                <div className="account-detail-heading">
                  <div style={{ display: "flex", textAlign: "center" }}>
                    <div className="bank-icon">
                      <img
                        alt={selectedAccount.bankName}
                        className="bank_icon_cls"
                        src={
                          BANKLIST?.filter((f) =>
                            selectedAccount.bankName
                              ?.toLowerCase()
                              ?.includes(f.name?.toLowerCase())
                          )?.[0]?.url ?? "./bank5.png"
                        }
                      ></img>
                    </div>
                    <h3>
                      {selectedAccount.bankName || "-"}
                      <p>{selectedAccount.accountType || "-"}</p>
                    </h3>

                    {selectedAccount.isPrimary && (
                      <span
                        className="b1-primary"
                        style={{
                          position: "absolute",
                          top: "60px",
                          right: "21px",
                        }}
                      >
                        Primary
                      </span>
                    )}
                  </div>
                  {/* in here if the account is primary then show the primary badge */}

                  {/* show the make primary button only if account is not primary */}
                  {!selectedAccount.isPrimary && (
                    <div>
                      <button
                        onClick={async () => {
                          try {
                            await handleMakePrimary(selectedAccount.id);
                            setShowAccountDetailsPopup(false);
                            await callUserFormGeneration();
                          } catch (error) {
                            console.error("Error in make primary flow:", error);
                            alert("Something went wrong. Please try again.");
                            setFormGenerationLoading(false); // Ensure loading stops on error
                          }
                        }}
                        disabled={formGenerationLoading}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          opacity: formGenerationLoading ? 0.7 : 1,
                          cursor: formGenerationLoading
                            ? "not-allowed"
                            : "pointer",
                        }}
                      >
                        {formGenerationLoading && (
                          <div
                            className="form-generation-spinner"
                            style={{
                              width: "16px",
                              height: "16px",
                              border: "2px solid #f3f3f3",
                              borderTop: "2px solid #0862BC",
                              borderRadius: "50%",
                              animation: "spin 1s linear infinite",
                            }}
                          />
                        )}
                        {formGenerationLoading
                          ? "Generating form..."
                          : "Make primary"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="detail-row">
                  <span className="detail-label">Name as on bank account</span>
                  <span
                    className="detail-value"
                    style={{
                      fontWeight: "800",
                      lineHeight: "30px",
                      marginTop: "4px",
                    }}
                  >
                    {selectedAccount.bankName}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Bank account number</span>
                  <span
                    className="detail-value"
                    style={{
                      fontWeight: "800",
                      lineHeight: "30px",
                      marginTop: "4px",
                    }}
                  >
                    XXXXXXXX{selectedAccount.accountNumber.slice(-4)}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Branch name</span>
                  <span
                    className="detail-value"
                    style={{
                      fontWeight: "800",
                      lineHeight: "30px",
                      marginTop: "4px",
                    }}
                  >
                    {selectedAccount.branchname || "-"}
                  </span>
                </div>

                <div className="detail-row last">
                  <span className="detail-label">IFSC</span>
                  <span
                    className="detail-value"
                    style={{
                      fontWeight: "800",
                      lineHeight: "30px",
                      marginTop: "4px",
                    }}
                  >
                    {selectedAccount.ifscCode}
                  </span>
                </div>
              </div>

              <div className="popup-actions-btn">
                {/* show the alright button only if account is  primary and remove the delete button */}
                {/* look if the bank is primary then dont show the delelte option instead show go-back button */}
                {selectedAccount.isPrimary ? (
                  <button
                    className="go-back-btn"
                    onClick={() => {
                      sendDataToMixpanel("cta_clicked", {
                        page: "rekyc_managebank_home",
                        cta_text: "go_bak",
                      });
                      setShowAccountDetailsPopup(false);
                    }}
                  >
                    Go Back
                  </button>
                ) : (
                  <button
                    className="delete-btn"
                    onClick={() => {
                      sendDataToMixpanel("cta_clicked", {
                        page: "rekyc_managebank_home",
                        cta_text: "delete",
                      });
                      setShowAccountDetailsPopup(false);
                      setdeleteDetailsPopup(true);
                    }}
                  >
                    Delete
                  </button>
                )}

                {/* show the make primary button only if account is not primary */}
                {!selectedAccount.isPrimary && (
                  <button
                    className="makeprimary-btn"
                    onClick={async () => {

                      sendDataToMixpanel("cta_clicked", {
                        page: "rekyc_managebank_home",
                        cta_text: "make_primary",
                      });

                      handleMakePrimary(selectedAccount.id);
                      await callUserFormGeneration();
                    }}
                  >
                    Make Primary
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteDetailsPopup && selectedAccount && (
        <div className="deleteaccount-details-popup-overlay">
          <div className="account-details-popup" ref={deletePopupRef}>
            <div className="delete-popup-content">
              <h3>
                <span className="info_icon_img">
                  <img src="./delet_bott.svg" alt="" />
                </span>
                Delete details
              </h3>
              <p className="border_if_u_wish">
                If you wish to delete the bank details, please write to us at{" "}
                <a href="mailto:support@unibrokers.in">support@unibrokers.in</a>{" "}
                and our support team will help you out.
              </p>
              <div className="popup-actions-btn">
                <button
                  className="alright-btn"
                  onClick={() => {
                    setdeleteDetailsPopup(false);
                    handleDeleteAccount(selectedAccount.id);
                  }}
                >
                  Alright
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Generation Loader Overlay */}
      {formGenerationLoading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "50px",
              height: "50px",
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #0862BC",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "16px",
            }}
          />
          <p style={{ color: "white", fontSize: "16px", fontWeight: "500" }}>
            Generating form...
          </p>
        </div>
      )}
    </div>
  );
};

export default withAuthCheck(Bank);
