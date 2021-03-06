import React, { useEffect, useState } from "react";
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInputChangeEventData,
  View,
} from "react-native";
import {
  Button,
  DateInput,
  RechangeInput,
  SelectInput,
  StyledText,
  TextInput,
} from "components/";
import { theme } from "theme/";
import { ScrollView } from "react-native-gesture-handler";
import { useThunkDispatch } from "hooks/";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { MessageTypes } from "store/reducers/message";
import { changeNameKey } from "../../helpers/objects";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import EditIcon from "../../../assets/Edit.svg";
import actions from "store/actions";

interface Props {
  id: number;
  title: string;
}

const emptyRechange = {
  title: "",
  number: "",
  id: "",
  mechanic_rechange_work_id: "",
  rechange_id: "",
};

function EditMWork({ id, title }: Props) {
  const dispatch = useDispatch();
  const thunkDispatch = useThunkDispatch();
  const navigation = useNavigation();

  const {
    user: { token },
    modal: { isOpen },
    loader: { isVisible },
    clients,
    machines,
    rechanges: rechangesList,
  } = useSelector((state) => state);

  const [rechanges, setRechanges] = useState<RechangeApi[]>([emptyRechange]);
  const [showRechanges, setShowRechanges] = useState(false);
  const [rechangesErrors, setRechangesErrors] = useState<
    RechangeWorkFormError[]
  >([{ index: 0, title: false, number: false }]);
  const [values, setValues] = useState<CreateMWorkForm>(defaultValues);
  const [errors, setErrors] = useState<CreateMWorkFormError>(defaultErrors);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [editable, setEditable] = useState(false);
  const [showClientName, setShowClientName] = React.useState(false);
  const [showMachineName, setShowMachineName] = React.useState(false);

  const addRechange = () => {
    setRechanges((rechanges) => [...rechanges, emptyRechange]);
    setRechangesErrors((error) => [
      ...error,
      { index: rechanges.length, title: false, number: false },
    ]);
  };

  const handleRechangeChange = (input: "title" | "number", index: number) => (
    e: NativeSyntheticEvent<TextInputChangeEventData>
  ) => {
    const _rechanges = [...rechanges];
    // Update value
    _rechanges[index][input] = e.nativeEvent.text;
    setRechanges(_rechanges);
    // Remove errors
    const _rechangesErrors = [...rechangesErrors];
    if (_rechangesErrors[index]) {
      _rechangesErrors[index][input] = false;
    }
    setRechangesErrors(_rechangesErrors);
  };

  const handleRechangeTitle = (input: "title" | "number", index: number) => (
    value: string
  ) => {
    const _rechanges = [...rechanges];
    // Update value
    _rechanges[index][input] = value;
    // Update id based on title
    const _rechangesId = rechangesList.filter((rechange) => {
      return value === rechange.title;
    });
    _rechanges[index].rechange_id = _rechangesId[0].id;
    setRechanges(_rechanges);
    // Remove errors
    const _rechangesErrors = [...rechangesErrors];
    if (_rechangesErrors[index]) {
      _rechangesErrors[index][input] = false;
    }
    setRechangesErrors(_rechangesErrors);
  };

  const formatValues = () => {
    const formValues = Object.assign({}, values);
    // Replace the client name with the client id
    clients.forEach((client) => {
      if (client.client_name === formValues.client) {
        formValues.client = client.client_id;
      }
    });
    // Replace the project name with the project id
    machines.forEach((machine) => {
      if (machine.machine_name === formValues.machine) {
        formValues.machine = machine.machine_id;
      }
    });
    return formValues;
  };
  /** Function that update a work and executes when press accept on modal */
  const updateMechanicWork = async () => {
    const formValues = formatValues();
    const { error, message } = await thunkDispatch(
      actions.updateMechanicWork(token, formValues, id, rechanges)
    );
    if (error) {
      thunkDispatch(
        actions.updateGlobalMessage({
          message: message || "",
          show: true,
          type: MessageTypes.Danger,
        })
      );
    } else {
      thunkDispatch(
        actions.updateGlobalMessage({
          message: "",
          show: false,
          type: MessageTypes.Danger,
        })
      );
      dispatch(actions.hideModal());
      navigation.navigate("FinishStep", {
        message: "Tu trabajo se ha creado correctamente",
      });
    }
  };

  /** Function to execute when decline the modal */
  const closeModal = () => {
    dispatch(actions.hideModal());
  };

  const updateValues = (values: CreateMWorkForm) => setValues(values);

  useEffect(() => {
    const updateRechanges = async () => {
      const { rechanges } = await actions.getMechanicRechanges(token, id);
      const formatedRechanges = await formatToRechangeValues(rechanges);
      const mergedRechanges = formatedRechanges.map((formatRechange) => {
        rechangesList.forEach((bdRechanges) => {
          if (bdRechanges.id === formatRechange.rechange_id) {
            formatRechange.title = bdRechanges.title;
          }
        });
        return formatRechange;
      });
      const errorsRechanges = mergedRechanges.map((_, index) => ({
        index,
        title: false,
        number: false,
      }));
      if (mergedRechanges.length > 0) {
        setRechanges(mergedRechanges);
      } else {
        setRechanges([emptyRechange]);
      }
      setRechangesErrors(errorsRechanges);
    };
    updateRechanges();
  }, [rechangesList]);

  /** Get clients, projects, machines  */
  useEffect(() => {
    let mounted = true;
    const getData = async () => {
      thunkDispatch(actions.enableLoader());
      const { error, work } = await actions.getMechanicWork(token, id);
      if (error && mounted) {
        setApiError(true);
      } else if (mounted) {
        const _values = formatToMechanicValues(work);
        updateValues(_values);
      }
      await thunkDispatch(actions.getRechangesFromApi(token));
      await thunkDispatch(actions.getClientsFromApi(token));
      await thunkDispatch(actions.getMachinesFromApi(token));
      setIsLoading(false);
      thunkDispatch(actions.disableLoader());
    };
    getData();
    dispatch(actions.setModalDecline(closeModal));
    if (mounted) {
      updateErrors(defaultErrors);
    }
    return () => {
      mounted = false;
    };
  }, []);

  const handleOnChangeSelect = (name: keyof CreateMWorkForm) => (
    value: string | Date
  ) => {
    setValues({ ...values, [name]: value });
    setErrors({ ...errors, [name]: false });
  };

  const updateErrors = (_errors: CreateMWorkFormError) =>
    setErrors({ ...errors, ..._errors });

  const onSubmit = async () => {
    // Enable loader
    await thunkDispatch(actions.enableLoader());
    // Get errors
    let _errors = errors;
    let hasError = false;
    await Promise.all(
      Object.keys(values).map((key) => {
        // Add custom errors
        const currentValue = values[key as keyof CreateMWorkForm];

        // Check if value is empty
        if (!currentValue) {
          _errors[key as keyof CreateMWorkFormError] = true;
          hasError = true;
          return true;
        }
      })
    );
    // Check if rechanges has errors
    if (rechanges.length === 0) {
      setRechangesErrors([]);
    } else {
      const _rechangesErrors = rechanges.map((rechange, index) => {
        const error: RechangeWorkFormError = {
          index,
          title: false,
          number: false,
        };
        if (!rechange.title) {
          error.title = true;
        }
        if (!rechange.number) {
          error.number = true;
        }
        return error;
      });
      setRechangesErrors(_rechangesErrors);
    }
    updateErrors(_errors);
    // Show modal if has errors
    if (hasError) {
      dispatch(actions.showModal());
    } else {
      await updateMechanicWork();
      navigation.navigate("FinishStep", {
        message: "Tu trabajo se ha creado correctamente",
      });
      dispatch(actions.hideModal());
    }
    // Set modal accept function
    dispatch(actions.setModalAccept(updateMechanicWork));
    // Disable loader
    thunkDispatch(actions.disableLoader());
  };

  const enableEditMode = () => setEditable(true);

  const finishWork = async () => {
    try {
      await thunkDispatch(actions.finishMechanicWork(token, id));
      navigation.navigate("FinishStep", {
        message: "Has cerrado tu trabajo correctamente",
      });
    } catch (e) {
      thunkDispatch(
        actions.updateGlobalMessage({
          message: "Error al cerrar el trabajo, intentelo m??s tarde.",
          show: true,
          type: MessageTypes.Danger,
        })
      );
    }
  };

  React.useEffect(() => {
    dispatch(actions.setModalAccept(updateMechanicWork));
  }, [values]);

  // Update client name when do the api call
  React.useEffect(() => {
    const copyWork = Object.assign({}, values);
    clients.forEach((client) => {
      if (client.client_id === values.client) {
        copyWork.client = client.client_name;
      }
    });
    setValues(copyWork);
    setShowClientName(true);
  }, [clients]);

  // Update machine name when do the api call
  React.useEffect(() => {
    const copyWork = Object.assign({}, values);
    machines.forEach((machine) => {
      if (machine.machine_id === values.machine) {
        copyWork.machine = machine.machine_name;
      }
    });
    setValues(copyWork);
    setShowMachineName(true);
  }, [machines]);

  const loadedAllValues = showClientName && showMachineName;
  const canRender = !isVisible && !apiError && !isLoading && loadedAllValues;

  return canRender ? (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, paddingVertical: 24 }}
        contentContainerStyle={{
          flex: 1,
        }}
      >
        <KeyboardAwareScrollView style={{ flex: 1 }}>
          <StyledText color={theme.colors.secondary} align="center" size={3}>
            {title}
          </StyledText>
          <View style={styles.root}>
            <SelectInput
              placeholder="Cliente"
              options={clients.map((client) => client.client_name)}
              value={values.client}
              labelError={errors.client}
              style={styles.select}
              editable={editable}
              onChange={handleOnChangeSelect("client")}
            />
            <SelectInput
              options={machines.map((machine) => machine.machine_name)}
              placeholder="Maquinas"
              value={values.machine}
              style={styles.select}
              labelError={errors.machine}
              editable={editable}
              onChange={handleOnChangeSelect("machine")}
            />
            <DateInput
              placeholder="Fecha"
              style={styles.select}
              labelError={errors.date}
              value={values.date}
              editable={editable}
              onChange={handleOnChangeSelect("date")}
            />
            <TextInput
              labelAlign="left"
              label="Horas"
              color={theme.colors.secondary}
              value={values.hours}
              keyboardType="numeric"
              style={styles.select}
              labelError={errors.hours}
              editable={editable}
              onChangeText={handleOnChangeSelect("hours")}
            />
            <TextInput
              labelAlign="left"
              label="Trabajos"
              color={theme.colors.secondary}
              value={values.works}
              style={styles.select}
              labelError={errors.works}
              editable={editable}
              onChangeText={handleOnChangeSelect("works")}
            />
            {rechanges.map((rechange, index) => {
              return (
                <RechangeInput
                  showAdd={index + 1 == rechanges.length}
                  editable={editable}
                  key={`rechange-${index}`}
                  index={index}
                  textInput={{
                    value: rechange.title,
                    onChange: handleRechangeTitle("title", index),
                  }}
                  numberInput={{
                    label: "#",
                    value: rechange.number,
                    onChange: handleRechangeChange("number", index),
                  }}
                  errors={rechangesErrors}
                  onPressAdd={addRechange}
                  onShowOptions={setShowRechanges}
                  style={styles.select}
                />
              );
            })}
            {editable && (
              <Button
                text="Guardar cambios"
                styleText={{
                  color: theme.colors.light,
                  children: "Crear",
                  size: 2.5,
                }}
                style={[styles.button, { width: 302, marginTop: 16 }]}
                onPress={onSubmit}
              ></Button>
            )}
          </View>
          {showRechanges && <View style={styles.rechangesSpace}></View>}
        </KeyboardAwareScrollView>
        {isOpen && <View style={styles.modalSpacing}></View>}
      </ScrollView>
      {!editable && (
        <View style={styles.modalEditContainer}>
          <View>
            <EditIcon onPress={enableEditMode} />
          </View>
          <Button
            text="Cerrar trabajo"
            onPress={finishWork}
            style={styles.button}
            styleText={{
              size: 2.5,
              color: theme.colors.light,
              children: "Cerrar trabajo",
            }}
          />
        </View>
      )}
    </View>
  ) : null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 48,
  },
  rechangesSpace: {
    width: "100%",
    height: 160,
  },
  select: {
    marginBottom: 24,
  },
  button: {
    backgroundColor: theme.colors.primary,
    width: 172,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  modalSpacing: {
    width: "100%",
    height: 160,
  },
  modalEditContainer: {
    height: 90,
    backgroundColor: theme.colors.light,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
});

const defaultValues: CreateMWorkForm = {
  client: "",
  date: null,
  hours: "",
  machine: "",
  works: "",
  rechanges: [],
};

const defaultErrors: CreateMWorkFormError = {
  client: false,
  date: false,
  hours: false,
  machine: false,
  works: false,
  rechanges: false,
};

const formatToMechanicValues = (work: DriverWork) => {
  let _work = work as any;
  _work = changeNameKey(_work, "mechanic_work_client_id", "client");
  _work = changeNameKey(_work, "mechanic_work_date", "date");
  _work = changeNameKey(_work, "mechanic_work_hours", "hours");
  _work = changeNameKey(_work, "mechanic_work_machine_id", "machine");
  _work = changeNameKey(_work, "mechanic_work_works", "works");
  const currentWork = _work;
  if (currentWork.date) {
    currentWork.date = new Date(currentWork.date);
  }
  return currentWork;
};

const formatToRechangeValues = async (rechanges: any[]) => {
  const formatedRechange = await Promise.all(
    rechanges.map((rechange) => {
      let _rechange = rechange;
      _rechange = changeNameKey(
        _rechange,
        "mechanic_rechange_number",
        "number"
      );
      _rechange = changeNameKey(_rechange, "mechanic_rechange_id", "id");
      return _rechange;
    })
  );
  return formatedRechange;
};

export default EditMWork;
