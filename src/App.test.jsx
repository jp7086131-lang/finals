import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import Header from './components/Header';
import { peso } from './utils/format';

test('renders motobook dashboard', () => {
  render(<App />);
  expect(screen.getAllByText(/MotoBook/i)[0]).toBeInTheDocument();
  // Landing content updated: assert landing/auth copy is present
  expect(screen.getByText(/Order food, track deliveries, and manage MotoBook\./i)).toBeInTheDocument();
  expect(screen.getByText(/Sign in to MotoBook/i)).toBeInTheDocument();
});

test('header search is interactive and clearable', async () => {
  const setSearchQuery = jest.fn();
  render(
    <Header
      cartCount={2}
      activePage="Products"
      user={{ name: 'Admin User' }}
      logout={jest.fn()}
      onSettings={jest.fn()}
      searchQuery="rice"
      setSearchQuery={setSearchQuery}
    />,
  );

  userEvent.type(screen.getByPlaceholderText(/Search product/i), ' bowl');
  expect(setSearchQuery).toHaveBeenCalled();

  userEvent.click(screen.getByLabelText(/Clear search/i));
  expect(setSearchQuery).toHaveBeenCalledWith('');
});

test('formats peso values consistently', () => {
  expect(peso(125)).toBe('PHP 125.00');
});
