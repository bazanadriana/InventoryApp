import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * When visited, this page immediately logs the user out and redirects home.
 */
export default function Logout() {
  const { logout } = useAuth();         
  const navigate = useNavigate();

  useEffect(() => {
    logout();                             
    navigate("/", { replace: true });     
  }, [logout, navigate]);

  return null; 
}
