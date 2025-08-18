"use client";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { loginUser, signupUser, logoutUser, getCurrentUser, clearError } from '@/store/authSlice';
import { LoginCredentials, SignupCredentials } from '@/types/auth';

export const useAuth = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { user, isLoading, error } = useSelector((state: RootState) => state.auth);

    const login = async (credentials: LoginCredentials) => {
        return dispatch(loginUser(credentials));
    };

    const signup = async (credentials: SignupCredentials) => {
        const response = dispatch(signupUser(credentials));
        console.log('Signup response in hook:', response);
        return response;
    };

    const logout = async () => {
        return dispatch(logoutUser());
    };

    const fetchCurrentUser = async () => {
        return dispatch(getCurrentUser());
    };

    const clearAuthError = () => {
        dispatch(clearError());
    };

    return {
        user,
        isLoading,
        error,
        login,
        signup,
        logout,
        fetchCurrentUser,
        clearAuthError,
        isAuthenticated: !!user,
    };
};
