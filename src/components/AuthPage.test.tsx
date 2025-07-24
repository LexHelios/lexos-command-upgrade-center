import { render, screen, fireEvent } from '@testing-library/react';
import { AuthPage } from '@/components/AuthPage';

describe('AuthPage', () => {
  it('renders the login form', () => {
    render(<AuthPage />);

    // Click on the "Sign In" tab to make the form visible
    fireEvent.click(screen.getByRole('tab', { name: /Sign In/i }));
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });
});