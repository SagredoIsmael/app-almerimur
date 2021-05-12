import { UPDATE_MESSAGE } from "../actions/message";
import { AnyAction } from "redux";

export enum MessageTypes {
  Success = "Success",
  Danger = "Danger",
  Info = "Info",
}

const initialState: MessageState = {
  message: "Default message",
  show: false,
  type: MessageTypes.Danger,
};

const messageReducer = (
  state: MessageState = initialState,
  action: AnyAction
) => {
  switch (action.type) {
    case UPDATE_MESSAGE:
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

export default messageReducer;
