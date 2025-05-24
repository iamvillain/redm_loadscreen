--[[ local canCloseLoading = false
local loadingComplete = false

RegisterNetEvent('basic_loadscreen:client:startLoading')
AddEventHandler('basic_loadscreen:client:startLoading', function(value)
    if value then
        print('[basic_loadscreen] Loading ...........', value)
    end
end)

RegisterNUICallback('loadingComplete', function(data, cb)
    print("[basic_loadscreen] loadingComplete recibido")
    loadingComplete = true
    cb('ok')
end)

local function endShutdown()
    DoScreenFadeOut(1500)  -- Fade out en 1.5 seg
    Wait(2000)             -- Esperamos un poco más para dar tiempo a la carga
    ShutdownLoadingScreen()
    ShutdownLoadingScreenNui()
    DoScreenFadeIn(1500)   -- Fade in en 1.5 seg
end

CreateThread(function()
    while true do
        Wait(100)

        if NetworkIsSessionStarted() then
            if not canCloseLoading then
                canCloseLoading = true
                SendNUIMessage({ eventName = "canCloseLoading" })
            end
        else
            canCloseLoading = false
        end

        if canCloseLoading and loadingComplete then
            print("[basic_loadscreen] Sesión iniciada y carga completa, cerrando loadscreen")
            endShutdown()
            break
        end
    end
end) ]]