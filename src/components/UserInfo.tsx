import React from 'react';

interface UserInfoProps {
  avatar: string;
  name: string;
  isOnline?: boolean;
  lastSeen?: string;
}

const UserInfo: React.FC<UserInfoProps> = ({ avatar, name, isOnline, lastSeen }) => {
  return (
    <>
      <div className="relative">
        <img
          src={avatar}
          alt={name}
          className="w-10 h-10 rounded-full object-cover border-2 border-[#57da74]"
        />
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        )}
      </div>
      <div className="ml-3 flex-1">
        <h1 className="text-lg font-bold text-black">{name}</h1>
        <p className="text-sm text-gray-500">
          {isOnline ? 'Online' : lastSeen ? `Visto por último ${new Date(lastSeen).toLocaleDateString('pt-BR')}` : 'Offline'}
        </p>
      </div>
    </>
  );
};

export default UserInfo;