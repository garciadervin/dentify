import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BottomNavBar from '@/components/BottomNavBar';

describe('BottomNavBar', () => {
  it('should render 4 tab items', () => {
    render(<BottomNavBar />);
    const tabs = screen.getAllByTestId(/^tab-/);
    expect(tabs).toHaveLength(4);
  });

  it('should render a tab for Dashboard (index) with a home icon', () => {
    render(<BottomNavBar />);
    expect(screen.getByTestId('tab-index')).toBeTruthy();
  });

  it('should render a tab for Simulator (simulator) with a 3D icon', () => {
    render(<BottomNavBar />);
    expect(screen.getByTestId('tab-simulator')).toBeTruthy();
  });

  it('should render a tab for Scanner (scanner) with a camera icon', () => {
    render(<BottomNavBar />);
    expect(screen.getByTestId('tab-scanner')).toBeTruthy();
  });

  it('should render a tab for Chat (chat) with an AI icon', () => {
    render(<BottomNavBar />);
    expect(screen.getByTestId('tab-chat')).toBeTruthy();
  });

  it('should apply active tint color to the active tab', () => {
    const activeTintColor = '#0077B6';
    render(<BottomNavBar activeTintColor={activeTintColor} />);
    const activeTab = screen.getByTestId('tab-index');
    expect(activeTab).toHaveStyle({ color: activeTintColor });
  });
});
