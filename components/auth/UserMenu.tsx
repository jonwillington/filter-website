'use client';

import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar, DropdownSection } from '@heroui/react';
import { useAuth } from '@/lib/context/AuthContext';
import { User, Heart, Settings, LogOut, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function UserMenu() {
  const { user, userProfile, signOut } = useAuth();
  const router = useRouter();

  if (!user || !userProfile) return null;

  const handleAction = async (key: string) => {
    switch (key) {
      case 'profile':
        router.push('/profile');
        break;
      case 'favorites':
        router.push('/favorites');
        break;
      case 'reviews':
        router.push('/reviews');
        break;
      case 'settings':
        router.push('/settings');
        break;
      case 'signout':
        await signOut();
        break;
    }
  };

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Avatar
          as="button"
          src={userProfile.photoURL}
          name={userProfile.displayName}
          size="sm"
          className="cursor-pointer transition-transform hover:scale-105"
        />
      </DropdownTrigger>
      <DropdownMenu
        aria-label="User menu"
        onAction={(key) => handleAction(key as string)}
        disabledKeys={['email']}
      >
        <DropdownSection showDivider>
          <DropdownItem
            key="email"
            className="h-14 gap-2"
            textValue={userProfile.email}
          >
            <p className="font-semibold">{userProfile.displayName}</p>
            <p className="text-xs text-default-500">{userProfile.email}</p>
          </DropdownItem>
        </DropdownSection>
        <DropdownSection showDivider>
          <DropdownItem
            key="profile"
            startContent={<User className="w-4 h-4" />}
          >
            Profile
          </DropdownItem>
          <DropdownItem
            key="favorites"
            startContent={<Heart className="w-4 h-4" />}
          >
            Favorites
          </DropdownItem>
          <DropdownItem
            key="reviews"
            startContent={<MessageSquare className="w-4 h-4" />}
          >
            My Reviews
          </DropdownItem>
          <DropdownItem
            key="settings"
            startContent={<Settings className="w-4 h-4" />}
          >
            Settings
          </DropdownItem>
        </DropdownSection>
        <DropdownSection>
          <DropdownItem
            key="signout"
            color="danger"
            startContent={<LogOut className="w-4 h-4" />}
          >
            Sign Out
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
}
