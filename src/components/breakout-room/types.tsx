export const ItemTypes = {
  USER: 'user',
};

export interface UserType {
  id: string;
  name: string;
  roomId: number;
}

export interface RoomType {
  id: number;
  name: string;
}
